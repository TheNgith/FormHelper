import type {
  Column,
  Content,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import { EQUIPMENT, LETTERHEAD, SCHOOL, supervisorSignatureName } from '../constants';
import type { FormValues } from '../schema';
import { formatVietnameseDate, nfc } from '../text';
import { PDF_FONT } from './fonts';

/**
 * Dựng bố cục file PDF theo bản thiết kế lại ở docs/don.html.
 *
 * Mọi khoảng cách đều tính bằng point (1 pt = 1/72 inch) để khi in ở tỉ lệ
 * 100% trên khổ A4 thì lề khớp với bản mẫu: lề trên, phải, dưới 2 cm và lề
 * trái 3 cm — chừa chỗ đóng ghim hoặc kẹp vào bìa hồ sơ.
 *
 * So với bản trước, đơn lấy lại dáng công văn: hai cột tiêu đề ở đầu trang,
 * ngày tháng nằm ngay dưới dòng "Độc lập - Tự do - Hạnh phúc" thay vì ở cuối
 * trang, thông tin sinh viên xếp một cột cho dễ dò, và bỏ ô "Xác nhận của bộ
 * môn". Chính chỗ bỏ đó bù lại phần lề rộng thêm, nên đơn cỡ trung bình vẫn
 * nằm gọn trong một trang; đơn dài hơn tự sang trang mới và khối chữ ký luôn
 * đi liền một chỗ.
 */

const BASE_FONT_SIZE = 13;

/**
 * Bản thiết kế đặt `line-height: 1.4`, nhưng con số đó không bê thẳng sang
 * pdfmake được. CSS nhân 1,4 với cỡ chữ; pdfmake nhân với chiều cao tự nhiên
 * của phông, mà cả bốn kiểu Libertinus đều cao 1,14 em (ascender 894 + descender
 * 246 trên em 1000). Để nguyên 1,4 thì mỗi dòng dôi ra 2,5 pt, và cộng dồn hơn
 * ba mươi dòng là đủ đẩy khối chữ ký sang trang thứ hai ngay cả với đơn ba mẫu.
 */
const LINE_HEIGHT = 1.4 / 1.14;

/** Cỡ chữ nhỏ hơn cho hai dòng in hoa ở tiêu đề và cho ghi chú dưới ô ký. */
const SMALL_FONT_SIZE = 12;

/** Bảng mẫu đo hạ xuống nửa point cho gọn bề ngang. */
const TABLE_FONT_SIZE = 12.5;

/** 2 cm và 3 cm quy ra point. */
const MARGIN = 57;
const MARGIN_LEFT = 85;

/**
 * Khoảng trống chừa cho chữ ký tay: khoảng 2,5 cm, đủ rộng để ký thoải mái mà
 * nét chữ không chạm vào dòng tên in sẵn ở dưới.
 */
const SIGNATURE_SPACE = 70;

/**
 * Nét kẻ ngắn dưới tên đơn vị và dưới dòng "Độc lập - Tự do - Hạnh phúc".
 * Đây là một đường kẻ riêng chứ không phải gạch chân: ngắn hơn dòng chữ và
 * cách chữ một quãng.
 */
const RULE_RATIO = 0.85;
const RULE_GAP = 3.5;
const RULE_THICKNESS = 0.75;

/**
 * Bề rộng chữ đo sẵn bằng chính phông Libertinus Bold ở đúng cỡ đang in, vì
 * lúc dựng doc definition thì pdfmake chưa nạp phông nên không đo được. Sửa
 * chữ hoặc cỡ chữ hai dòng này thì đo lại, không thì nét kẻ sẽ lệch tỉ lệ.
 */
const SCHOOL_TEXT_WIDTH = 76.2;
const MOTTO_TEXT_WIDTH = 165.4;

/**
 * Nét kẻ nằm giữa cột. Hai cột sao ở hai bên đẩy nét kẻ vào chính giữa mà
 * không cần biết cột rộng bao nhiêu; chúng cũng là canvas rỗng nên không kéo
 * theo chiều cao một dòng chữ như ô chữ trống.
 *
 * Cả khối chỉ chiếm đúng `RULE_GAP` chiều cao — canvas một nét ngang cao 0 pt.
 * Phần nội dung ngay sau nét kẻ vì thế phải tự chừa lề trên cho mình.
 */
function rule(textWidth: number): Content {
  const width = textWidth * RULE_RATIO;
  return {
    columns: [
      { width: '*', canvas: [] },
      {
        width,
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: RULE_THICKNESS },
        ],
      },
      { width: '*', canvas: [] },
    ],
    columnGap: 0,
    margin: [0, RULE_GAP, 0, 0],
  };
}

export type PdfData = {
  values: FormValues;
  maHoSo: string;
};

/**
 * Một dòng "Nhãn: giá trị" trong khối thông tin sinh viên. Nhãn chiếm đúng
 * 130 pt nên mọi giá trị đều bắt đầu thẳng một cột, kể cả khi nhãn dài ngắn
 * khác nhau. `spaceBelow` để dòng cuối khối chừa thêm khoảng trống.
 */
function labelled(label: string, value: string, spaceBelow = 2): Content {
  return {
    columns: [
      { width: 130, text: label },
      { width: '*', text: nfc(value) },
    ],
    columnGap: 0,
    margin: [0, 0, 0, spaceBelow],
  };
}

/** Một ô chữ ký: chức danh, ghi chú, khoảng trống rồi tên. */
function signature(role: string, name: string): Column {
  return {
    width: '50%',
    stack: [
      { text: role, bold: true, alignment: 'center' },
      {
        text: '(Ký và ghi rõ họ tên)',
        italics: true,
        fontSize: SMALL_FONT_SIZE,
        alignment: 'center',
      },
      {
        text: nfc(name),
        bold: true,
        alignment: 'center',
        margin: [0, SIGNATURE_SPACE, 0, 0],
      },
    ],
  };
}

export function buildDocDefinition({ values, maHoSo }: PdfData): TDocumentDefinitions {
  const samples = values.samples.map((s) => ({
    name: nfc(s.name),
    state: nfc(s.state),
    solvent: nfc(s.solvent),
  }));

  const department = nfc(values.department);
  const supervisor = nfc(values.supervisor);

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [MARGIN_LEFT, MARGIN, MARGIN, MARGIN],

    defaultStyle: {
      font: PDF_FONT,
      fontSize: BASE_FONT_SIZE,
      lineHeight: LINE_HEIGHT,
    },

    // Mã hồ sơ nằm ngoài phần thân, ở góc dưới bên trái của mọi trang — cách
    // mép giấy 1 cm, tức là lọt vào phần lề chứ không chen vào nội dung.
    footer: () => ({
      text: `Mã hồ sơ: ${maHoSo}`,
      fontSize: 9.5,
      color: '#888888',
      lineHeight: 1,
      margin: [28, 15, 0, 0],
    }),

    content: [
      // Tiêu đề công văn: cơ quan bên trái, quốc hiệu bên phải. Cột phải rộng
      // hơn vì dòng "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" phải nằm trọn một
      // dòng, không được xuống hàng.
      {
        columns: [
          {
            width: '40%',
            stack: [
              // Tên đại học chỉ là cơ quan chủ quản nên để chữ thường; đơn vị
              // ban hành là Trường Dược mới in đậm và gạch chân, giống cách
              // cột phải nhấn dòng "Độc lập - Tự do - Hạnh phúc".
              ...LETTERHEAD.map((line) => ({
                text: line,
                fontSize: SMALL_FONT_SIZE,
                alignment: 'center' as const,
              })),
              { text: SCHOOL, bold: true, alignment: 'center' },
              rule(SCHOOL_TEXT_WIDTH),
            ],
          },
          {
            width: '60%',
            stack: [
              {
                text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                bold: true,
                fontSize: SMALL_FONT_SIZE,
                alignment: 'center',
              },
              {
                text: 'Độc lập - Tự do - Hạnh phúc',
                bold: true,
                alignment: 'center',
                margin: [0, 1, 0, 0],
              },
              rule(MOTTO_TEXT_WIDTH),
              {
                text: `${nfc(values.city)}, ${formatVietnameseDate(values.date)}`,
                italics: true,
                alignment: 'center',
                margin: [0, 8, 0, 0],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 4],
      },

      {
        text: 'ĐƠN XIN SỬ DỤNG THIẾT BỊ',
        bold: true,
        fontSize: 16,
        alignment: 'center',
        margin: [0, 16, 0, 14],
      },

      // Nhãn "Kính gửi:" chiếm đúng bề rộng chữ của nó, phần còn lại là một
      // cột riêng. Nhờ vậy tên giảng viên tự thẳng cột với tên bộ môn ở dòng
      // trên mà không phải đo bề rộng chữ rồi thụt lề bằng con số cứng.
      {
        columns: [
          { width: 'auto', text: 'Kính gửi:', bold: true },
          {
            width: '*',
            stack: [{ text: department }, { text: supervisor }],
          },
        ],
        columnGap: 4,
        margin: [0, 0, 0, 10],
      },

      labelled('Em tên là:', values.studentName),
      labelled('Mail:', values.email),
      labelled('Lớp:', values.className),
      labelled('Mã số sinh viên:', values.studentId),
      labelled('Số điện thoại:', values.phone),
      labelled('Niên khóa:', values.cohort, 10),

      {
        text:
          `Hiện em đang làm khóa luận tốt nghiệp dưới sự hướng dẫn của ${supervisor}. ` +
          `Nay em làm đơn này kính mong Bộ môn cho phép em được mượn và sử dụng ` +
          `${EQUIPMENT} tại Bộ môn.`,
        alignment: 'justify',
        margin: [0, 0, 0, 8],
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
          widths: ['8%', '34%', '24%', '34%'],
          body: [
            [
              { text: 'STT', bold: true },
              { text: 'Tên mẫu', bold: true },
              { text: 'Trạng thái mẫu', bold: true },
              { text: 'Dung môi có thể hòa tan', bold: true },
            ],
            ...samples.map((sample, index) => [
              { text: String(index + 1) },
              { text: sample.name },
              { text: sample.state },
              { text: sample.solvent },
            ]),
          ],
        },
        // Mọi ô đều căn giữa, kể cả tên mẫu do sinh viên nhập.
        style: 'sampleCell',
        layout: {
          hLineWidth: () => 0.75,
          vLineWidth: () => 0.75,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 10],
      },

      {
        text:
          'Em xin cam kết, trong thời gian sử dụng thiết bị, em sẽ tuân thủ sự ' +
          'sắp xếp và hướng dẫn của các cán bộ, giảng viên phụ trách.',
        alignment: 'justify',
        margin: [0, 0, 0, 8],
      },
      {
        text: 'Em xin chân thành cảm ơn.',
        margin: [0, 0, 0, 12],
      },

      // Hai ô chữ ký đi liền một khối. Nếu bảng mẫu dài làm tràn trang thì cả
      // khối cùng sang trang mới, không để tiêu đề "Người làm đơn" ở cuối
      // trang này còn chỗ ký rơi sang trang sau.
      {
        unbreakable: true,
        columns: [
          // Tên dưới dòng kẻ ký không mang "Thầy"/"Cô" — đó là lời của sinh
          // viên trong câu văn, không phải một phần của tên người ký.
          signature('Giảng viên hướng dẫn', supervisorSignatureName(supervisor)),
          signature('Người làm đơn', values.studentName),
        ],
      },
    ],

    styles: {
      sampleCell: {
        fontSize: TABLE_FONT_SIZE,
        alignment: 'center',
      },
    },
  };
}

/** Tên file tải về, ví dụ DonXinSuDungThietBi_2200123_IR-20260811-A7K3.pdf */
export function pdfFilename(values: FormValues, maHoSo: string): string {
  return `DonXinSuDungThietBi_${values.studentId}_${maHoSo}.pdf`;
}
