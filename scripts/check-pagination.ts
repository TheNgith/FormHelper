/**
 * Dựng đơn với nhiều số lượng mẫu khác nhau rồi đếm số trang, dùng để biết
 * đơn tràn sang trang thứ hai từ mẫu thứ mấy.
 *
 *   npx tsx scripts/check-pagination.ts
 */

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// @ts-expect-error — pdfmake không kèm khai báo kiểu cho entry Node.
import pdfMake from 'pdfmake';

import { buildDocDefinition } from '../src/lib/pdf/docDefinition';
import { nodeFonts } from './fonts';
import type { FormValues } from '../src/lib/schema';

pdfMake.setFonts(nodeFonts());

const BASE: Omit<FormValues, 'samples'> = {
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
};

mkdirSync(resolve('preview'), { recursive: true });

const counts = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [1, 3, 5, 6, 7, 8, 9, 12, 20, 30];

for (const count of counts) {
  const samples = Array.from({ length: count }, (_, i) => ({
    name: `Nguyên liệu thử nghiệm số ${i + 1}`,
    state: 'Rắn' as const,
    solvent: 'Methanol',
  }));

  const doc = pdfMake.createPdf(
    buildDocDefinition({ values: { ...BASE, samples }, maHoSo: 'IR-20260811-A7K3' }),
  );
  const buffer: Buffer = await doc.getBuffer();

  // Đếm số trang từ chính nội dung PDF, không cần công cụ ngoài.
  const pages = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`${String(count).padStart(2)} mẫu -> ${pages} trang`);
}
