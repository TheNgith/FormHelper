/**
 * Nhận đơn từ trang tĩnh và ghi một dòng vào Google Sheet.
 *
 * Dán toàn bộ file này vào trình soạn thảo Apps Script của bảng tính, điền
 * SHEET_ID và TOKEN, rồi triển khai theo hướng dẫn trong README.
 *
 * Lưu ý: mỗi lần sửa code phải triển khai một **phiên bản mới**
 * (Deploy -> New deployment), nếu chỉ bấm lưu thì địa chỉ /exec vẫn chạy
 * bản cũ.
 */

var SHEET_ID = 'DIEN_ID_BANG_TINH_VAO_DAY';
var SHEET_NAME = 'Submissions';

/** Phải trùng với VITE_SHEETS_TOKEN lúc build trang web. */
var TOKEN = 'DIEN_TOKEN_VAO_DAY';

var HEADERS = [
  'timestamp',
  'maHoSo',
  'studentName',
  'studentId',
  'email',
  'phone',
  'className',
  'cohort',
  'department',
  'supervisor',
  'city',
  'requestDate',
  'sampleCount',
  'sampleName',
  'sampleState',
  'solvent',
  'pdfLink',
  'userAgent',
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty request' });
    }

    var body = JSON.parse(e.postData.contents);

    if (body.token !== TOKEN) {
      return json({ ok: false, error: 'unauthorized' });
    }

    // Bẫy bot: ô này ẩn trên giao diện nên người thật luôn để trống. Nhận
    // rồi bỏ đi, không báo lỗi, để bot không biết mình bị chặn.
    if (body.website) {
      return json({ ok: true, id: body.maHoSo });
    }

    var maHoSo = String(body.maHoSo || '').trim();
    if (!maHoSo) {
      return json({ ok: false, error: 'missing maHoSo' });
    }

    // Chỉ cho một luồng ghi tại một thời điểm. Hai sinh viên bấm gửi cùng
    // lúc mà không khóa thì hai dòng có thể đè lên nhau.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      var sheet = getSheet();

      // Bấm gửi hai lần, hoặc gửi lại sau khi mạng chập chờn làm mất phản
      // hồi, đều phải cho ra đúng một dòng. Đơn gửi lại mang cùng mã hồ sơ
      // nên chỉ cần dò mã là biết đã ghi hay chưa.
      if (findRowByMaHoSo(sheet, maHoSo) > 0) {
        return json({ ok: true, id: maHoSo, duplicate: true });
      }

      var rows = body.samples || [];

      sheet.appendRow([
        new Date(),
        maHoSo,
        body.studentName || '',
        body.studentId || '',
        body.email || '',
        body.phone || '',
        body.className || '',
        body.cohort || '',
        body.department || '',
        body.supervisor || '',
        body.city || '',
        body.requestDate || '',
        rows.length,
        joinColumn(rows, 'name'),
        joinColumn(rows, 'state'),
        joinColumn(rows, 'solvent'),
        body.pdfLink || '',
        body.userAgent || '',
      ]);

      return json({ ok: true, id: maHoSo });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Đóng gói kết quả thành JSON để trả về cho trình duyệt. */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * Gộp một cột của danh sách mẫu thành chuỗi ngăn cách bằng ", ".
 *
 * Ba cột sampleName, sampleState và solvent khớp nhau theo vị trí: phần tử
 * thứ n của cột này ứng với phần tử thứ n của hai cột kia. Vì vậy phải bỏ
 * dấu phẩy có sẵn trong từng giá trị, nếu không một tên mẫu chứa dấu phẩy
 * sẽ tự tách làm hai và lệch toàn bộ các cột còn lại.
 */
function joinColumn(rows, key) {
  var parts = [];
  for (var i = 0; i < rows.length; i++) {
    var value = rows[i] ? rows[i][key] : '';
    value = value === null || value === undefined ? '' : String(value);
    parts.push(value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return parts.join(', ');
}

/** Trả về số dòng chứa mã hồ sơ, hoặc -1 nếu chưa có. */
function findRowByMaHoSo(sheet, maHoSo) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  var column = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (var i = 0; i < column.length; i++) {
    if (String(column[i][0]).trim() === maHoSo) return i + 2;
  }
  return -1;
}

/** Lấy tab dữ liệu, tự tạo kèm hàng tiêu đề nếu chưa có. */
function getSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);

    // Ba cột danh sách mẫu để dạng văn bản thuần, nếu không Google Sheets
    // sẽ cố hiểu chuỗi dài ngăn cách bằng dấu phẩy thành số hoặc ngày.
    sheet.getRange('N:P').setNumberFormat('@');
  }

  return sheet;
}

/**
 * Chạy tay một lần từ trình soạn thảo để tạo sẵn tab và hàng tiêu đề, đồng
 * thời cấp quyền truy cập bảng tính cho script.
 */
function setup() {
  getSheet();
}
