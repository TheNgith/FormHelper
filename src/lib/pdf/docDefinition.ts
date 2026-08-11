import type {
  Content,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import { EQUIPMENT, supervisorFullLabel } from '../constants';
import type { FormValues } from '../schema';
import { formatVietnameseDate, nfc } from '../text';

/**
 * Dựng bố cục file PDF theo đúng mẫu giấy của bộ môn.
 *
 * Mọi khoảng cách đều tính bằng point (1 pt = 1/72 inch) để khi in ở tỉ lệ
 * 100% trên khổ A4 thì lề khớp với bản in sẵn: lề 57 pt ≈ 2 cm.
 */

const BASE_FONT_SIZE = 13;
const LINE_HEIGHT = 1.35;
const PAGE_MARGIN = 57;

/** Khoảng trống chừa cho chữ ký tay. */
const SIGNATURE_SPACE = 90;

/**
 * Bề rộng của chuỗi "Kính gửi: " ở Tinos 13 pt, đo từ bảng metric của phông.
 * Dùng làm mức thụt đầu dòng để tên giảng viên nằm thẳng cột với tên bộ môn
 * ở dòng trên.
 */
const KINH_GUI_INDENT = 53.3;

export type PdfData = {
  values: FormValues;
  maHoSo: string;
};

/** Một dòng "Nhãn: giá trị" trong khối thông tin sinh viên. */
function labelled(label: string, value: string): Content {
  return {
    text: [{ text: `${label} `, bold: false }, { text: nfc(value) }],
    margin: [0, 0, 0, 2],
  };
}

export function buildDocDefinition({ values, maHoSo }: PdfData): TDocumentDefinitions {
  const samples = values.samples.map((s) => ({
    name: nfc(s.name),
    state: nfc(s.state),
    solvent: nfc(s.solvent),
  }));

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN],

    defaultStyle: {
      font: 'Tinos',
      fontSize: BASE_FONT_SIZE,
      lineHeight: LINE_HEIGHT,
    },

    // Mã hồ sơ nằm ngoài phần thân, sát mép trên bên phải của mọi trang.
    // Đặt ở 20 pt tính từ mép giấy nên không chạm vào dòng quốc hiệu (bắt
    // đầu ở 57 pt).
    header: () => ({
      text: `Mã hồ sơ: ${maHoSo}`,
      alignment: 'right',
      fontSize: 8,
      color: '#888888',
      lineHeight: 1,
      margin: [PAGE_MARGIN, 20, PAGE_MARGIN, 0],
    }),

    content: [
      {
        text: 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        bold: true,
        alignment: 'center',
      },
      {
        text: 'Độc lập - Tự do - Hạnh phúc',
        bold: true,
        alignment: 'center',
        margin: [0, 6, 0, 0],
      },
      {
        text: 'ĐƠN XIN SỬ DỤNG THIẾT BỊ',
        bold: true,
        alignment: 'center',
        margin: [0, 18, 0, 18],
      },

      // Khối "Kính gửi" để nguyên chiều rộng trang, phần thông tin sinh viên
      // mới chia hai cột. Nhờ vậy cột phải (MSSV, SĐT, niên khóa) luôn bắt
      // đầu ngang hàng với dòng "Em tên là" mà không cần chèn dòng trống.
      {
        text: [{ text: 'Kính gửi: ' }, { text: nfc(values.department) }],
        margin: [0, 0, 0, 2],
      },
      {
        text: nfc(supervisorFullLabel(values.supervisor)),
        // Thụt vào cho thẳng hàng với tên bộ môn ở dòng trên.
        margin: [KINH_GUI_INDENT, 0, 0, 6],
      },

      {
        columns: [
          {
            width: '58%',
            stack: [
              labelled('Em tên là:', values.studentName),
              labelled('Mail:', values.email),
              labelled('Lớp:', values.className),
            ],
          },
          {
            width: '42%',
            stack: [
              labelled('Mã số sinh viên:', values.studentId),
              labelled('SĐT:', values.phone),
              labelled('Niên khóa:', values.cohort),
            ],
          },
        ],
        margin: [0, 0, 0, 10],
      },

      {
        text: `Hiện em đang làm khóa luận tốt nghiệp dưới sự hướng dẫn của ${nfc(
          supervisorFullLabel(values.supervisor),
        )}.`,
        alignment: 'justify',
        margin: [0, 0, 0, 6],
      },
      {
        text:
          `Nay em làm đơn này kính mong Bộ môn cho phép em được mượn và sử dụng ` +
          `${EQUIPMENT} tại Bộ môn.`,
        alignment: 'justify',
        margin: [0, 0, 0, 6],
      },
      {
        text: 'Các mẫu đo bao gồm:',
        margin: [0, 0, 0, 8],
      },

      {
        table: {
          headerRows: 1,
          keepWithHeaderRows: 1,
          dontBreakRows: true,
          widths: ['8%', '52%', '18%', '22%'],
          body: [
            [
              { text: 'STT', alignment: 'center' },
              { text: 'TÊN MẪU', alignment: 'center' },
              { text: 'TRẠNG THÁI MẪU', alignment: 'center' },
              { text: 'DUNG MÔI CÓ THỂ HOÀ TAN', alignment: 'center' },
            ],
            ...samples.map((sample, index) => [
              { text: String(index + 1), alignment: 'center' as const },
              { text: sample.name },
              { text: sample.state },
              { text: sample.solvent },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 10],
      },

      {
        text:
          'Em xin cam kết, trong thời gian sử dụng thiết bị, em sẽ tuân thủ sự ' +
          'sắp xếp và hướng dẫn của các cán bộ, giảng viên phụ trách.',
        alignment: 'justify',
        margin: [0, 0, 0, 6],
      },
      {
        text: 'Em xin chân thành cảm ơn.',
        margin: [0, 0, 0, 10],
      },

      // Ngày tháng, hai ô chữ ký và dòng xác nhận của bộ môn đi liền một
      // khối. Nếu bảng mẫu dài làm tràn trang thì cả khối cùng sang trang
      // mới, không để tiêu đề "Người làm đơn" ở cuối trang này còn chỗ ký
      // rơi sang trang sau.
      {
        unbreakable: true,
        stack: [
          {
            text: `${nfc(values.city)}, ${formatVietnameseDate(values.date)}`,
            alignment: 'right',
            italics: true,
            margin: [0, 0, 0, 4],
          },
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: 'Giảng viên hướng dẫn', bold: true, alignment: 'center' },
                  {
                    text: nfc(values.supervisor),
                    alignment: 'center',
                    margin: [0, SIGNATURE_SPACE, 0, 0],
                  },
                ],
              },
              {
                width: '50%',
                stack: [
                  { text: 'Người làm đơn', bold: true, alignment: 'center' },
                  {
                    text: nfc(values.studentName),
                    alignment: 'center',
                    margin: [0, SIGNATURE_SPACE, 0, 0],
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 24],
          },
          {
            text: 'Xác nhận của bộ môn',
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, SIGNATURE_SPACE],
          },
        ],
      },
    ],
  };
}

/** Tên file tải về, ví dụ DonXinSuDungThietBi_2200123_IR-20260811-A7K3.pdf */
export function pdfFilename(values: FormValues, maHoSo: string): string {
  return `DonXinSuDungThietBi_${values.studentId}_${maHoSo}.pdf`;
}
