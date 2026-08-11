/**
 * Nạp bộ phông Tinos vào hệ thống file ảo của pdfmake.
 *
 * pdfmake nhận nội dung phông dưới dạng base64. Bốn file .ttf nằm trong
 * public/fonts/ và chỉ được tải khi thực sự cần dựng PDF, nên màn hình nhập
 * liệu không phải gánh thêm mấy trăm KB.
 */

import type pdfMakeType from 'pdfmake/build/pdfmake';

const FONT_FILES = [
  'Tinos-Regular.ttf',
  'Tinos-Bold.ttf',
  'Tinos-Italic.ttf',
  'Tinos-BoldItalic.ttf',
] as const;

export const TINOS_FAMILY = {
  Tinos: {
    normal: 'Tinos-Regular.ttf',
    bold: 'Tinos-Bold.ttf',
    italics: 'Tinos-Italic.ttf',
    bolditalics: 'Tinos-BoldItalic.ttf',
  },
};

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Chuyển theo từng khối; truyền cả mảng vài trăm KB vào String.fromCharCode
  // một lần sẽ tràn số đối số cho phép của hàm.
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

let registered: Promise<void> | null = null;

/**
 * Tải và đăng ký phông, chỉ thực hiện một lần cho mỗi phiên làm việc.
 * Gọi lại nhiều lần thì dùng chung kết quả của lần đầu.
 */
export function registerFonts(pdfMake: typeof pdfMakeType): Promise<void> {
  registered ??= (async () => {
    const base = import.meta.env.BASE_URL;
    const entries = await Promise.all(
      FONT_FILES.map(async (file) => {
        const response = await fetch(`${base}fonts/${file}`);
        if (!response.ok) {
          throw new Error(`Không tải được phông ${file} (HTTP ${response.status}).`);
        }
        return [file, toBase64(await response.arrayBuffer())] as const;
      }),
    );

    pdfMake.addVirtualFileSystem(Object.fromEntries(entries));
    pdfMake.addFonts(TINOS_FAMILY);
  })().catch((error) => {
    // Cho phép thử lại ở lần bấm sau thay vì kẹt luôn ở trạng thái lỗi.
    registered = null;
    throw error;
  });

  return registered;
}
