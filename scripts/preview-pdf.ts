/**
 * Dựng thử file PDF ngoài trình duyệt để soi bố cục nhanh khi chỉnh khoảng
 * cách, không cần mở web và điền lại biểu mẫu.
 *
 *   npx tsx scripts/preview-pdf.ts [đường-dẫn-ra.pdf] [số-mẫu]
 *
 * Dữ liệu mẫu lấy theo đơn tham chiếu của bộ môn, kèm vài ký tự có dấu chồng
 * để kiểm tra phông: ẫ ệ ượ ỹ Đ ồ. Truyền thêm số mẫu để dựng đơn dài, dùng
 * khi cần xem cách bảng ngắt trang.
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// @ts-expect-error — pdfmake không kèm khai báo kiểu cho entry Node.
import pdfMake from 'pdfmake';

import { buildDocDefinition } from '../src/lib/pdf/docDefinition';
import { nodeFonts } from './fonts';
import type { FormValues } from '../src/lib/schema';

const SAMPLE: FormValues = {
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

const out = resolve(process.argv[2] ?? 'preview/don-mau.pdf');
const sampleCount = Number(process.argv[3]);

// Đơn dài thì lặp lại danh sách mẫu cho đủ số lượng, đánh số để dễ dò khi
// xem bảng ngắt trang ở đâu.
const values: FormValues = Number.isFinite(sampleCount)
  ? {
      ...SAMPLE,
      samples: Array.from({ length: sampleCount }, (_, i) => {
        const base = SAMPLE.samples[i % SAMPLE.samples.length];
        return { ...base, name: `${i + 1}. ${base.name}` };
      }),
    }
  : SAMPLE;

mkdirSync(dirname(out), { recursive: true });

pdfMake.setFonts(nodeFonts());

await pdfMake
  .createPdf(buildDocDefinition({ values, maHoSo: 'IR-20260811-A7K3' }))
  .write(out);

console.log(`Đã ghi ${out}`);
