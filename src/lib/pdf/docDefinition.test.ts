import { describe, expect, it } from 'vitest';

import type { FormValues } from '../schema';
import { buildDocDefinition, pdfFilename } from './docDefinition';
import { LIBERTINUS_FAMILY, PDF_FONT } from './fonts';

const VALUES: FormValues = {
  department: 'Bộ môn Hóa Hữu Cơ',
  supervisor: 'Thầy PGS.TS. Trần Văn Thành',
  studentName: 'Nguyễn Thị Ngọc Ánh',
  studentId: '2200123',
  email: 'ngocanh@example.com',
  phone: '0912345678',
  className: 'D2A',
  cohort: '2022 - 2026',
  city: 'TP. Hồ Chí Minh',
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

  it('in đủ phần tiêu đề cơ quan, quốc hiệu và tên đơn', () => {
    expect(text).toContain('ĐẠI HỌC Y DƯỢC');
    expect(text).toContain('THÀNH PHỐ HỒ CHÍ MINH');
    expect(text).toContain('Trường Dược');
    expect(text).toContain('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
    expect(text).toContain('Độc lập - Tự do - Hạnh phúc');
    expect(text).toContain('ĐƠN XIN SỬ DỤNG THIẾT BỊ');
  });

  it('ghi đủ sáu dòng thông tin sinh viên', () => {
    for (const label of [
      'Em tên là:',
      'Mail:',
      'Lớp:',
      'Mã số sinh viên:',
      'Số điện thoại:',
      'Niên khóa:',
    ]) {
      expect(text, label).toContain(label);
    }
    expect(text).toContain('ngocanh@example.com');
    expect(text).toContain('2200123');
    expect(text).toContain('0912345678');
    expect(text).toContain('2022 - 2026');
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
    expect(text).toContain('TP. Hồ Chí Minh, ngày 11 tháng 08 năm 2026');
  });

  it('có hai ô chữ ký, không còn ô xác nhận của bộ môn', () => {
    expect(text).toContain('Giảng viên hướng dẫn');
    expect(text).toContain('Người làm đơn');
    expect(text).not.toContain('Xác nhận của bộ môn');
  });

  it('bỏ cách xưng hô ở tên dưới dòng kẻ ký', () => {
    const block = (doc.content as Array<Record<string, any>>).find(
      (item) => item && item.unbreakable,
    );
    const lines = allText(block);
    // Câu văn xưng "Thầy", chỗ ký thì không.
    expect(lines).toContain('PGS.TS. Trần Văn Thành');
    expect(lines).not.toContain('Thầy PGS.TS. Trần Văn Thành');
  });

  it('không tách khối chữ ký ra hai trang', () => {
    const content = doc.content as Array<Record<string, any>>;
    const block = content.find((item) => item && item.unbreakable);
    expect(block).toBeDefined();
    expect(allText(block).join('\n')).toContain('Người làm đơn');
  });

  it('đặt mã hồ sơ ở cuối trang, không nằm trong phần thân', () => {
    expect(text).not.toContain('IR-20260811-A7K3');
    expect(doc.header).toBeUndefined();
    const footer = doc.footer as () => { text: string };
    expect(footer().text).toBe('Mã hồ sơ: IR-20260811-A7K3');
  });

  it('dùng khổ A4, lề 2 cm và lề trái 3 cm', () => {
    expect(doc.pageSize).toBe('A4');
    expect(doc.pageMargins).toEqual([85, 57, 57, 57]);
  });

  it('dùng phông Libertinus đã đăng ký cho toàn bộ đơn', () => {
    expect(doc.defaultStyle?.font).toBe(PDF_FONT);
    expect(Object.keys(LIBERTINUS_FAMILY)).toContain(PDF_FONT);
  });

  describe('bảng mẫu đo', () => {
    it('có hàng tiêu đề đúng bốn cột', () => {
      expect(tableBody(doc)[0].map((c) => c.text)).toEqual([
        'STT',
        'Tên mẫu',
        'Trạng thái mẫu',
        'Dung môi có thể hòa tan',
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
