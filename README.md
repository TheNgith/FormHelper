# Đơn xin sử dụng thiết bị

Trang tĩnh giúp sinh viên điền và in đơn xin mượn **máy quang phổ hồng ngoại
(FT-IR)** của Bộ môn Hóa Hữu Cơ, đồng thời ghi lại mỗi lần nộp vào một Google
Sheet.

Luồng sử dụng gồm ba màn hình:

1. **Điền đơn** — thông tin sinh viên và danh sách mẫu đo (thêm, xóa, nhân
   đôi, đổi thứ tự).
2. **Xem lại** — bản tóm tắt chỉ đọc, xếp đúng thứ tự như trong file PDF để dò
   từ trên xuống. Chưa có gì được gửi đi ở bước này.
3. **Hoàn tất** — hiện mã hồ sơ và nút tải file PDF khổ A4 để in và ký.

Không có gì được ghi vào Google Sheet cho tới khi bấm **Xác nhận và gửi**, và
file PDF chỉ được dựng khi bấm **Tải PDF**.

## Yêu cầu

- Node.js 22 trở lên.

## Chạy tại máy

```bash
npm install
cp .env.example .env   # điền endpoint và token, xem phần dưới
npm run dev
```

Chạy `npm run dev` sẽ có thêm nút `[dev] Xem thử PDF` ở màn hình xem lại để
kiểm tra bố cục mà không phải gửi đơn thật. Nút này không có trong bản build.

## Các lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy máy chủ phát triển |
| `npm run build` | Dựng bản phát hành vào `dist/` |
| `npm run preview` | Xem thử bản đã dựng |
| `npm test` | Chạy toàn bộ bài kiểm tra |
| `npm run lint` | Kiểm tra mã nguồn |

Hai script phụ trợ để soi file PDF ngoài trình duyệt:

```bash
npx tsx scripts/preview-pdf.ts        # dựng preview/don-mau.pdf từ dữ liệu mẫu
npx tsx scripts/check-pagination.ts   # đếm số trang theo số lượng mẫu
```

## Thiết lập Google Sheet

1. Tạo một bảng tính mới, chép lấy ID trên thanh địa chỉ
   (`docs.google.com/spreadsheets/d/<ID>/edit`).
2. Mở **Extensions → Apps Script**, xóa nội dung có sẵn rồi dán toàn bộ
   [apps-script/Code.gs](apps-script/Code.gs).
3. Điền `SHEET_ID` và `TOKEN` ở đầu file. `TOKEN` là chuỗi tự đặt, phải trùng
   với `VITE_SHEETS_TOKEN` lúc build trang web.
4. Chạy hàm `setup` một lần từ trình soạn thảo để tạo tab `Submissions` kèm
   hàng tiêu đề, đồng thời cấp quyền cho script.
5. **Deploy → New deployment → Web app**, đặt *Execute as* là **Me** và *Who
   has access* là **Anyone**. Chép địa chỉ `/exec` vào `VITE_SHEETS_ENDPOINT`.

> **Mỗi lần sửa `Code.gs` phải Deploy một phiên bản mới.** Chỉ bấm lưu thì
> địa chỉ `/exec` vẫn chạy bản cũ, và triệu chứng thường thấy là "sửa rồi mà
> không thấy gì thay đổi".

### Hình dạng dữ liệu

Mỗi lần nộp là **một dòng**. Danh sách mẫu được gộp phẳng vào ba cột
`sampleName`, `sampleState`, `solvent`, ngăn cách bằng `, ` và **khớp nhau
theo vị trí**: phần tử thứ *n* của ba cột thuộc về cùng một mẫu.

```
sampleName:  Nguyên liệu Dapagliflozin, HHVL DAP - HPMC, HPTR DAP - Crosspovidon
sampleState: Rắn, Rắn, Rắn
solvent:     Methanol, Methanol, Methanol
```

Vì dấu phẩy là ký tự ngăn cách, `Code.gs` **bỏ dấu phẩy có sẵn trong từng giá
trị** trước khi gộp (thay bằng khoảng trắng). Nếu không, một tên mẫu chứa dấu
phẩy sẽ tự tách làm hai và làm lệch toàn bộ ba cột so với nhau.

Ba cột này được đặt định dạng văn bản thuần để Google Sheets không cố hiểu
chuỗi dài thành số hay ngày tháng.

Cách gộp phẳng như trên tiện để lưu vết giấy tờ, nhưng **không tiện để thống
kê**: muốn lọc hay đếm theo trạng thái mẫu thì phải tách chuỗi ra trước. Nếu
sau này bộ môn cần truy vấn dữ liệu, nên đổi sang mỗi mẫu một dòng.

### Chống trùng dòng

`Code.gs` dò `maHoSo` trước khi ghi. Bấm gửi hai lần, hoặc gửi lại sau khi
mạng chập chờn làm mất phản hồi, đều chỉ cho ra một dòng vì lần gửi lại mang
đúng mã hồ sơ cũ.

## Bảo mật — đọc trước khi triển khai

**Địa chỉ Apps Script và token đều nằm trong gói JavaScript gửi xuống trình
duyệt.** Ai mở DevTools cũng đọc được và có thể tự gọi endpoint để ghi dòng
rác vào bảng.

Đây là hệ quả không tránh được của mô hình "trang tĩnh ghi thẳng vào Google
Sheet": trang tĩnh không giữ được khóa dịch vụ, nên phải có một endpoint công
khai. Token và ô bẫy bot chỉ chặn được bot quét tự động, **không chặn được
người cố tình**.

Cách giảm thiểu:

- Không công bố rộng địa chỉ trang.
- Bật lịch sử phiên bản của bảng tính để hoàn tác được.
- Thỉnh thoảng rà lại các dòng mới.

Nếu mức rủi ro đó không chấp nhận được thì lời giải là một hàm serverless nhỏ
giữ khóa dịch vụ, chứ không phải tin rằng token trong bundle là bảo mật.

## Triển khai lên GitHub Pages

1. Vào **Settings → Pages**, chọn *Source* là **GitHub Actions**.
2. Vào **Settings → Secrets and variables → Actions**, thêm hai secret
   `VITE_SHEETS_ENDPOINT` và `VITE_SHEETS_TOKEN`.
3. Đẩy code lên nhánh `main`.
   [Workflow](.github/workflows/deploy.yml) sẽ chạy kiểm tra, dựng và triển khai.

Bản build dùng đường dẫn tương đối (`base: './'`) nên chạy được cả ở thư mục
gốc lẫn thư mục con `/ten-repo/` mà không phải chỉnh gì.

## Phông chữ

`public/fonts/` chứa bốn kiểu Tinos đã cắt gọn còn Latin + tiếng Việt (2,2 MB
xuống còn khoảng 330 KB). Tinos tương thích metric với Times New Roman và phát
hành theo giấy phép SIL Open Font License 1.1 (`public/fonts/OFL.txt`).

Tinos **không phải** Times New Roman — Times New Roman có bản quyền và không
được phép phát hành kèm. Hai phông cùng bề rộng chữ nên bố cục giống nhau,
nhưng dáng chữ vẫn có khác biệt nhỏ.

Dựng lại phông (cần `pip install fonttools brotli`):

```bash
./scripts/build-fonts.sh
```

## Bố cục file PDF

Khổ A4, lề 1,5 cm, chữ Tinos 12 pt. Với các con số này thì đơn có tối đa **6
mẫu** nằm gọn một trang; đơn dài hơn tự sang trang mới, hàng tiêu đề của bảng
được lặp lại và không dòng mẫu nào bị cắt ngang trang.

Bản đầu dựng theo đúng mẫu giấy (13 pt, lề 2 cm) thì **không đơn nào vừa một
trang**, kể cả đơn chỉ có một mẫu: riêng ba ô chữ ký đã chiếm gần một phần tư
trang giấy. Các con số hiện tại là bản nén để đổi lấy chỗ trống đó.

Mã hồ sơ được in nhỏ màu xám ở góc trên bên phải **mọi trang**, nằm ngoài
phần thân nên không đụng vào dòng quốc hiệu.

## Cấu trúc thư mục

```
apps-script/Code.gs      Mã chạy trên Google Apps Script
public/fonts/            Phông Tinos đã cắt gọn + giấy phép
scripts/                 Dựng phông, xem thử PDF, đếm số trang
src/lib/schema.ts        Định nghĩa dữ liệu đơn — nguồn duy nhất
src/lib/pdf/             Bố cục PDF và nạp phông
src/lib/storage.ts       Bản nháp và thông tin cá nhân (localStorage)
src/lib/session.ts       Đơn vừa gửi (sessionStorage)
src/screens/             Ba màn hình
```

## Thay đổi thường gặp

- **Thêm giảng viên hướng dẫn** — sửa `SUPERVISORS` trong
  [src/lib/constants.ts](src/lib/constants.ts).
- **Đổi trạng thái mẫu cho phép** — sửa `SAMPLE_STATES` cùng file.
- **Đổi tên bộ môn hoặc thiết bị** — sửa `DEPARTMENT` / `EQUIPMENT` cùng file.
- **Chỉnh khoảng cách trong PDF** — các hằng số ở đầu
  [src/lib/pdf/docDefinition.ts](src/lib/pdf/docDefinition.ts), kiểm lại bằng
  `scripts/check-pagination.ts`.

Đơn hiện chỉ dùng cho FT-IR. Nếu sau này bộ môn thêm thiết bị khác thì
`docDefinition.ts` cần tách thành nhiều mẫu thay vì một hàm cố định.
