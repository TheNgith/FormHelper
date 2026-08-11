/**
 * Điểm vào duy nhất cho việc tạo PDF.
 *
 * pdfmake cùng bộ phông nặng hơn phần còn lại của ứng dụng cộng lại, nên
 * module này chỉ được nạp bằng `import()` động. Màn hình xem lại gọi
 * `prewarmPdf()` ngay khi hiện ra; trong lúc sinh viên đọc bản tóm tắt thì
 * thư viện đã tải xong, đến màn hình sau bấm "Tải PDF" là có file ngay.
 */

import type { FormValues } from '../schema';

type PdfModule = typeof import('pdfmake/build/pdfmake');

let modulePromise: Promise<PdfModule> | null = null;

async function loadPdfMake(): Promise<PdfModule> {
  modulePromise ??= (async () => {
    const [{ default: pdfMake }, { registerFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('./fonts'),
    ]);
    await registerFonts(pdfMake);
    return pdfMake;
  })().catch((error) => {
    modulePromise = null;
    throw error;
  });

  return modulePromise;
}

/** Nạp trước thư viện và phông. Lỗi ở đây không cần báo cho người dùng —
 *  lần bấm "Tải PDF" sau đó sẽ thử lại và báo lỗi nếu vẫn hỏng. */
export async function prewarmPdf(): Promise<void> {
  try {
    await loadPdfMake();
  } catch {
    // Bỏ qua: chỉ là bước nạp trước cho nhanh.
  }
}

/**
 * Dựng PDF rồi tải về. Bấm bao nhiêu lần cũng cho ra file giống hệt nhau vì
 * toàn bộ nội dung, kể cả mã hồ sơ, đều lấy từ tham số truyền vào.
 */
export async function downloadPdf(values: FormValues, maHoSo: string): Promise<void> {
  const [pdfMake, { buildDocDefinition, pdfFilename }] = await Promise.all([
    loadPdfMake(),
    import('./docDefinition'),
  ]);

  pdfMake
    .createPdf(buildDocDefinition({ values, maHoSo }))
    .download(pdfFilename(values, maHoSo));
}
