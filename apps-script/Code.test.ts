import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

/**
 * Code.gs chạy trên Apps Script chứ không nằm trong gói web, nhưng đây là chỗ
 * quyết định hình dạng dữ liệu trong Google Sheet nên vẫn cần được kiểm tra.
 * Bài kiểm tra nạp thẳng file .gs rồi dựng sẵn các đối tượng mà Apps Script
 * cung cấp (SpreadsheetApp, LockService, ContentService).
 */

type Row = unknown[];

function loadCodeGs(rows: Row[]) {
  const source = readFileSync(resolve(import.meta.dirname, 'Code.gs'), 'utf8');

  const sheet = {
    rows,
    getLastRow: () => rows.length + 1, // +1 cho hàng tiêu đề
    getRange: (top: number, left: number, height: number) => ({
      getValues: () =>
        rows
          .slice(top - 2, top - 2 + height)
          .map((row) => [row[left - 1]]),
      setNumberFormat: () => undefined,
    }),
    appendRow: (row: Row) => rows.push(row),
    setFrozenRows: () => undefined,
  };

  const globals = {
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => sheet,
        insertSheet: () => sheet,
      }),
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text: string) => ({
        setMimeType: (mime: string) => ({ getContent: () => text, getMimeType: () => mime }),
      }),
    },
  };

  const factory = new Function(
    ...Object.keys(globals),
    `${source}
     return { doPost: doPost, joinColumn: joinColumn, findRowByMaHoSo: findRowByMaHoSo, TOKEN: TOKEN };`,
  );

  const api = factory(...Object.values(globals));
  return { ...api, sheet, rows };
}

function post(
  api: ReturnType<typeof loadCodeGs>,
  body: Record<string, unknown>,
): Record<string, any> {
  const result = api.doPost({ postData: { contents: JSON.stringify(body) } });
  return JSON.parse(result.getContent());
}

const TOKEN = 'DIEN_TOKEN_VAO_DAY';

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    token: TOKEN,
    maHoSo: 'IR-20260811-A7K3',
    studentName: 'Nguyễn Thị Ngọc Ánh',
    studentId: '2200123',
    email: 'a@b.com',
    phone: '0912345678',
    className: 'D2A',
    cohort: '2022 - 2026',
    department: 'Bộ môn Hóa Hữu Cơ',
    supervisor: 'PGS.TS. Trần Văn Thành',
    city: 'TP. HCM',
    requestDate: '2026-08-11',
    samples: [
      { name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' },
      { name: 'Mẫu B', state: 'Lỏng', solvent: 'Ethanol' },
    ],
    userAgent: 'test',
    ...overrides,
  };
}

/** Vị trí các cột theo mảng HEADERS trong Code.gs. */
const COL = { maHoSo: 1, sampleCount: 12, name: 13, state: 14, solvent: 15 };

describe('joinColumn', () => {
  let api: ReturnType<typeof loadCodeGs>;
  beforeEach(() => {
    api = loadCodeGs([]);
  });

  it('nối các giá trị bằng dấu phẩy và khoảng trắng', () => {
    const rows = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    expect(api.joinColumn(rows, 'name')).toBe('A, B, C');
  });

  it('bỏ dấu phẩy nằm trong từng giá trị', () => {
    const rows = [{ name: 'Mẫu X, dạng bột' }, { name: 'Mẫu Y' }];
    expect(api.joinColumn(rows, 'name')).toBe('Mẫu X dạng bột, Mẫu Y');
  });

  it('coi giá trị thiếu là chuỗi rỗng chứ không bỏ qua', () => {
    const rows = [{ name: 'A' }, {}, { name: 'C' }];
    expect(api.joinColumn(rows, 'name')).toBe('A, , C');
    expect(api.joinColumn(rows, 'name').split(', ')).toHaveLength(3);
  });

  it('gộp khoảng trắng thừa', () => {
    expect(api.joinColumn([{ name: '  A   B  ' }], 'name')).toBe('A B');
  });
});

describe('doPost', () => {
  it('ghi đúng một dòng cho đơn hợp lệ', () => {
    const api = loadCodeGs([]);
    const result = post(api, validBody());
    expect(result.ok).toBe(true);
    expect(api.rows).toHaveLength(1);
    expect(api.rows[0][COL.maHoSo]).toBe('IR-20260811-A7K3');
  });

  it('từ chối khi token sai', () => {
    const api = loadCodeGs([]);
    expect(post(api, validBody({ token: 'sai' })).error).toBe('unauthorized');
    expect(api.rows).toHaveLength(0);
  });

  it('nhận rồi bỏ đơn có ô bẫy bot được điền', () => {
    const api = loadCodeGs([]);
    const result = post(api, validBody({ website: 'https://spam.example' }));
    // Trả về ok để bot không biết mình bị chặn, nhưng không ghi gì cả.
    expect(result.ok).toBe(true);
    expect(api.rows).toHaveLength(0);
  });

  it('bấm gửi hai lần chỉ tạo một dòng', () => {
    const api = loadCodeGs([]);
    post(api, validBody());
    const second = post(api, validBody());
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(api.rows).toHaveLength(1);
  });

  it('gửi lại sau lỗi mạng vẫn chỉ một dòng vì trùng mã hồ sơ', () => {
    const api = loadCodeGs([]);
    post(api, validBody());
    post(api, validBody({ userAgent: 'lần thử lại' }));
    expect(api.rows).toHaveLength(1);
  });

  it('hai đơn khác mã hồ sơ thì ghi thành hai dòng', () => {
    const api = loadCodeGs([]);
    post(api, validBody());
    post(api, validBody({ maHoSo: 'IR-20260811-B8L4' }));
    expect(api.rows).toHaveLength(2);
  });

  it('từ chối đơn thiếu mã hồ sơ', () => {
    const api = loadCodeGs([]);
    expect(post(api, validBody({ maHoSo: '' })).ok).toBe(false);
    expect(api.rows).toHaveLength(0);
  });

  describe('ba cột danh sách mẫu', () => {
    it('có cùng số phần tử, bằng sampleCount', () => {
      const api = loadCodeGs([]);
      post(
        api,
        validBody({
          samples: [
            { name: 'A', state: 'Rắn', solvent: 'Methanol' },
            { name: 'B', state: 'Lỏng', solvent: 'Ethanol' },
            { name: 'C', state: 'Dung dịch', solvent: 'Nước' },
          ],
        }),
      );
      const row = api.rows[0];
      const counts = [COL.name, COL.state, COL.solvent].map(
        (i) => String(row[i]).split(', ').length,
      );
      expect(counts).toEqual([3, 3, 3]);
      expect(row[COL.sampleCount]).toBe(3);
    });

    it('tên mẫu chứa dấu phẩy không làm lệch ba cột', () => {
      const api = loadCodeGs([]);
      post(
        api,
        validBody({
          samples: [
            { name: 'Mẫu A, nghiền mịn', state: 'Rắn', solvent: 'Methanol' },
            { name: 'Mẫu B', state: 'Lỏng', solvent: 'Ethanol, khan' },
          ],
        }),
      );
      const row = api.rows[0];
      const names = String(row[COL.name]).split(', ');
      const states = String(row[COL.state]).split(', ');
      const solvents = String(row[COL.solvent]).split(', ');

      expect(names).toHaveLength(2);
      expect(states).toHaveLength(2);
      expect(solvents).toHaveLength(2);
      expect(row[COL.sampleCount]).toBe(2);

      // Phần tử thứ n của ba cột vẫn thuộc về cùng một mẫu.
      expect(names[0]).toBe('Mẫu A nghiền mịn');
      expect(states[0]).toBe('Rắn');
      expect(solvents[0]).toBe('Methanol');
      expect(names[1]).toBe('Mẫu B');
      expect(solvents[1]).toBe('Ethanol khan');
    });
  });
});
