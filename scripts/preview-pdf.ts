/**
 * Dựng thử file PDF ngoài trình duyệt để soi bố cục nhanh khi chỉnh khoảng
 * cách, không cần mở web và điền lại biểu mẫu.
 *
 *   npx tsx scripts/preview-pdf.ts [đường-dẫn-ra.pdf]
 *
 * Dữ liệu mẫu lấy theo đơn tham chiếu của bộ môn, kèm vài ký tự có dấu chồng
 * để kiểm tra phông: ẫ ệ ượ ỹ Đ ồ.
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// @ts-expect-error — pdfmake không kèm khai báo kiểu cho entry Node.
import pdfMake from 'pdfmake';

import { buildDocDefinition } from '../src/lib/pdf/docDefinition';
import type { FormValues } from '../src/lib/schema';

const SAMPLE: FormValues = {
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
    { name: 'Nguyên liệu Dapagliflozin DAP bình thường', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Nguyên liệu Dapagliflozin DAP nghiền mịn', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Nguyên liệu HPMC', state: 'Rắn', solvent: 'Methanol' },
    { name: 'HHVL DAP - HPMC', state: 'Rắn', solvent: 'Methanol' },
    { name: 'HPTR DAP - HPMC', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Nguyên liệu Crosspovidon', state: 'Rắn', solvent: 'Methanol' },
    { name: 'HHVL DAP - Crosspovidon', state: 'Rắn', solvent: 'Methanol' },
    { name: 'HPTR DAP - Crosspovidon', state: 'Rắn', solvent: 'Methanol' },
    { name: 'Dung dịch chuẩn đối chiếu (ẫ ệ ượ ỹ Đ ồ)', state: 'Dung dịch', solvent: 'Ethanol' },
  ],
};

const FONT_DIR = resolve(import.meta.dirname, '..', 'public', 'fonts');

const fonts = {
  Tinos: {
    normal: `${FONT_DIR}/Tinos-Regular.ttf`,
    bold: `${FONT_DIR}/Tinos-Bold.ttf`,
    italics: `${FONT_DIR}/Tinos-Italic.ttf`,
    bolditalics: `${FONT_DIR}/Tinos-BoldItalic.ttf`,
  },
};

const out = resolve(process.argv[2] ?? 'preview/don-mau.pdf');
mkdirSync(dirname(out), { recursive: true });

pdfMake.setFonts(fonts);

await pdfMake
  .createPdf(buildDocDefinition({ values: SAMPLE, maHoSo: 'IR-20260811-A7K3' }))
  .write(out);

console.log(`Đã ghi ${out}`);
