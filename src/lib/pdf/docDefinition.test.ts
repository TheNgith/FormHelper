import { describe, expect, it } from 'vitest';

import type { FormValues } from '../schema';
import { buildDocDefinition, pdfFilename } from './docDefinition';

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: 'ngocanh@example.com',
  phone: '0912345678',
  className: 'D2A',
  cohort: '2022 - 2026',
  city: 'TP. HCM',
  date: '2026-08-11',
  samples: [
    { name: 'Mẫu A', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Mẫu B', state: 'Lỏng', solvent: 'Ethanol' },
    { name: 'Mẫu C', state: 'Dung dịch', solvent: 'Nước' },
  ],
};

/** Gom toàn bộ chuỗi ký tự xuất hiện trong doc definition để dò nội dung. */
function allText(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(allText);
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      key === 'font' ? [] : allText(value),
    );
  }
  return [];
}

function tableBody(doc: ReturnType<typeof buildDocDefinition>) {
  const content = doc.content as Array<Record<string, any>>;
  const node = content.find((item) => item && 'table' in item);
  if (!node) throw new Error('không tìm thấy bảng mẫu đo');
  return node.table.body as Array<Array<{ text: string }>>;
}

describe('buildDocDefinition', () => {
  const doc = buildDocDefinition({ values: VALUES, maHoSo: 'IR-20260811-A7K3' });
  const text = allText(doc.content).join('\n');

  it('in đủ phần quốc hiệu và tiêu đề đơn', () => {
    expect(text).toContain('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(text).toContain('Độc lập - Tự do - Hạnh phúc');
    expect(text).toContain('ĐƠN XIN SỬ DỤNG THIẾT BỊ');
  });

  it('nêu tên giảng viên kèm chức danh trong câu mở đầu', () => {
    expect(text).toContain(
      'Hiện em đang làm khóa luận tốt nghiệp dưới sự hướng dẫn của Thầy PGS.TS. Trần Văn Thành.',
    );
  });

  it('nêu đúng thiết bị được mượn', () => {
    expect(text).toContain('máy quang phổ hồng ngoại (FT-IR)');
  });

  it('in đủ các câu cam kết và cảm ơn', () => {
    expect(text).toContain('Các mẫu đo bao gồm:');
    expect(text).toContain(
      'Em xin cam kết, trong thời gian sử dụng thiết bị, em sẽ tuân thủ sự sắp xếp và hướng dẫn của các cán bộ, giảng viên phụ trách.',
    );
    expect(text).toContain('Em xin chân thành cảm ơn.');
  });

  it('viết ngày tháng theo lối tiếng Việt', () => {
    expect(text).toContain('TP. HCM, ngày 11 tháng 08 năm 2026');
  });

  it('có đủ ba ô chữ ký', () => {
    expect(text).toContain('Giảng viên hướng dẫn');
    expect(text).toContain('Người làm đơn');
    expect(text).toContain('Xác nhận của bộ môn');
  });

  it('đặt mã hồ sơ ở đầu trang, không nằm trong phần thân', () => {
    expect(text).not.toContain('IR-20260811-A7K3');
    const header = doc.header as () => { text: string };
    expect(header().text).toBe('Mã hồ sơ: IR-20260811-A7K3');
  });

  it('dùng khổ A4 và lề 1,5 cm', () => {
    expect(doc.pageSize).toBe('A4');
    expect(doc.pageMargins).toEqual([43, 43, 43, 43]);
  });

  describe('bảng mẫu đo', () => {
    it('có hàng tiêu đề đúng bốn cột', () => {
      expect(tableBody(doc)[0].map((c) => c.text)).toEqual([
        'STT',
        'TÊN MẪU',
        'TRẠNG THÁI MẪU',
        'DUNG MÔI CÓ THỂ HOÀ TAN',
      ]);
    });

    it('đánh số thứ tự liên tục theo vị trí trong mảng', () => {
      const body = tableBody(doc);
      expect(body.slice(1).map((row) => row[0].text)).toEqual(['1', '2', '3']);
    });

    it('đánh lại số khi bỏ một dòng ở giữa', () => {
      const withoutMiddle = buildDocDefinition({
        values: { ...VALUES, samples: [VALUES.samples[0], VALUES.samples[2]] },
        maHoSo: 'IR-X',
      });
      const body = tableBody(withoutMiddle);
      expect(body.slice(1).map((row) => row[0].text)).toEqual(['1', '2']);
      expect(body[2][1].text).toBe('Mẫu C');
    });

    it('giữ nguyên thứ tự mẫu do người dùng sắp xếp', () => {
      const body = tableBody(doc);
      expect(body.slice(1).map((row) => row[1].text)).toEqual(['Mẫu A', 'Mẫu B', 'Mẫu C']);
      expect(body.slice(1).map((row) => row[2].text)).toEqual(['Rắn', 'Lỏng', 'Dung dịch']);
    });

    it('không tách một dòng mẫu ra hai trang', () => {
      const content = doc.content as Array<Record<string, any>>;
      const node = content.find((item) => item && 'table' in item)!;
      expect(node.table.dontBreakRows).toBe(true);
      expect(node.table.headerRows).toBe(1);
      expect(node.table.keepWithHeaderRows).toBe(1);
    });
  });

  it('chuẩn hóa chuỗi phân rã về dạng tổ hợp sẵn', () => {
    // ễ ở dạng phân rã chuẩn: e + dấu mũ (U+0302) + dấu ngã (U+0303).
    // Hai dấu này cùng lớp kết hợp nên thứ tự không được đảo — viết ngược lại
    // sẽ ra một ký tự khác hẳn chứ không phải cùng một chữ.
    const decomposed = 'Nguy' + String.fromCodePoint(0x65, 0x302, 0x303) + 'n';
    const doc = buildDocDefinition({
      values: { ...VALUES, studentName: decomposed },
      maHoSo: 'IR-X',
    });
    const joined = allText(doc.content).join('\n');
    expect(joined).toContain('Nguyễn');
    expect(joined).not.toContain(decomposed);
  });
});

describe('pdfFilename', () => {
  it('gồm mã số sinh viên và mã hồ sơ', () => {
    expect(pdfFilename(VALUES, 'IR-20260811-A7K3')).toBe(
      'DonXinSuDungThietBi_2200123_IR-20260811-A7K3.pdf',
    );
  });
});
