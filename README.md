# Đơn xin sử dụng thiết bị

Trang web giúp sinh viên điền và in đơn xin mượn **máy quang phổ hồng ngoại
(FT-IR)** của Bộ môn Hóa Hữu Cơ, đồng thời lưu mỗi lần nộp vào Firestore.

**Sinh viên không phải đăng nhập.** Mở trang là điền được ngay. Luồng sử dụng
gồm ba màn hình:

1. **Điền đơn** — thông tin sinh viên và danh sách mẫu đo (thêm, xóa, nhân
   đôi, đổi thứ tự).
2. **Xem lại** — bản tóm tắt chỉ đọc, xếp đúng thứ tự như trong file PDF để dò
   từ trên xuống. Chưa có gì được gửi đi ở bước này.
3. **Hoàn tất** — hiện mã hồ sơ và nút tải file PDF khổ A4 để in và ký.

Không có gì được ghi vào cơ sở dữ liệu cho tới khi bấm **Xác nhận và gửi**, và
file PDF chỉ được dựng khi bấm **Tải PDF**.

Bộ môn xem dữ liệu ở **trang quản trị** `/ir-form/dashboard/` — đăng nhập
Google, giới hạn trong hai địa chỉ — hoặc lấy về bằng `npm run export:csv` chạy
tại máy. Xem [Lấy dữ liệu về](#lấy-dữ-liệu-về).

## Yêu cầu

- Node.js 22 trở lên.
- Java 11 trở lên — Firestore emulator chạy trên JVM, và bài kiểm tra
  `firestore.rules` cần nó.

## Chạy tại máy

Không cần dự án Firebase thật, cũng không cần `.env`: bản dev nối thẳng vào
emulator.

```bash
npm install
npm run emulators     # cửa sổ 1 — Firestore emulator
npm run dev           # cửa sổ 2
```

Trang dev nằm ở **http://localhost:5173/ir-form/**, không phải ở gốc: `base`
là đường dẫn tuyệt đối, đúng bằng chỗ ứng dụng chạy thật. Vite in sẵn địa chỉ
đầy đủ khi khởi động. Trang quản trị ở
**http://localhost:5173/ir-form/dashboard/** — một điểm vào riêng của Vite, xem
`rollupOptions.input` trong [vite.config.ts](vite.config.ts).

Emulator Auth cho đăng nhập bằng **bất kỳ địa chỉ nào** gõ vào cửa sổ đăng
nhập, nên thử được cả hai phía của danh sách trắng: một địa chỉ trong
[src/lib/admins.ts](src/lib/admins.ts) thì vào được, một địa chỉ bất kỳ thì
nhận màn hình "not authorised".

Emulator **bỏ qua App Check hoàn toàn**, và bản dev cũng không khởi tạo App
Check. Nghĩa là chạy tại máy không bao giờ chạm tới nửa kia của ranh giới bảo
mật — xem [Bảo mật](#bảo-mật--đọc-trước-khi-sửa-firestorerules).

Màn hình xem lại có thêm nút `[dev] Xem thử PDF` để kiểm tra bố cục mà không
phải gửi đơn thật. Khối này bị loại hẳn khỏi bản build.

## Các lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy máy chủ phát triển |
| `npm run emulators` | Chạy emulator Firestore **và** Auth cho bản dev |
| `npm run build` | Dựng bản phát hành vào `dist/` |
| `npm run preview` | Xem thử bản đã dựng |
| `npm test` | Chạy toàn bộ bài kiểm tra, kể cả `firestore.rules` |
| `npm run test:rules` | Chỉ chạy bài kiểm tra `firestore.rules` |
| `npm run check:bundle` | Canh gói của sinh viên không lẫn thư viện của trang quản trị (chạy sau `build`) |
| `npm run export:csv` | Xuất mọi đơn đã nộp ra CSV (cần service account) |
| `npm run deploy:rules` | Đẩy riêng `firestore.rules` lên dự án thật |
| `npm run lint` | Kiểm tra mã nguồn |

Hai script phụ trợ để soi file PDF ngoài trình duyệt:

```bash
npx tsx scripts/preview-pdf.ts        # dựng preview/don-mau.pdf từ dữ liệu mẫu
npx tsx scripts/check-pagination.ts   # đếm số trang theo số lượng mẫu
```

## Bảo mật — đọc trước khi sửa `firestore.rules`

**Trình duyệt nói chuyện thẳng với Firestore.** Không còn máy chủ nào của
chúng ta đứng giữa. Hệ quả trực tiếp: `formSchema` trong
[src/lib/schema.ts](src/lib/schema.ts) chạy hoàn toàn trên máy người dùng, nên
nó giúp người điền đơn nhận ra lỗi chứ **không ngăn được ai**.

Còn đúng hai lớp, và chúng canh hai thứ khác nhau:

| Lớp | Chặn được | Không chặn được |
| --- | --- | --- |
| **App Check** (reCAPTCHA Enterprise) | script, bot, curl, trang khác gọi vào | một người thật ngồi trên đúng trang này |
| **[firestore.rules](firestore.rules)** | sai hình dạng, thừa khóa, ô quá dài, quá 60 mẫu, **mọi lượt đọc của người ngoài danh sách trắng**, mọi lượt sửa, mọi bộ sưu tập khác | một lời khai hợp lệ nhưng sai sự thật |

### Đường ghi không có danh tính, đường đọc thì có

Hai đường đi hai kiểu, và trộn lẫn chúng là hiểu sai cả thiết kế:

- **Ghi** — sinh viên nộp đơn, không đăng nhập. `allow create` không biết ai
  đang gọi; nó chỉ biết hình dạng của thứ được ghi.
- **Đọc và xóa** — chỉ trang quản trị `/ir-form/dashboard/`, sau một lượt đăng
  nhập Google, và chỉ hai địa chỉ trong `isAdmin()` của
  [firestore.rules](firestore.rules).

Quyền đọc từng bị đóng hẳn bằng `allow read: if false`, với lý do: *không có
danh tính nên mở một đường đọc cho trình duyệt là mở cho cả Internet, và người
lạ dò ID tài liệu sẽ gom được tên, mã số sinh viên, số điện thoại.* Lập luận ấy
đúng, và nó **có điều kiện** — nó đứng trên vế "không có danh tính". Trang quản
trị cấp một danh tính, nên vế ấy không còn, và quyền đọc mở lại đúng bằng cái
danh tính đó chứ không rộng hơn. Sinh viên vẫn không đọc được gì; bài kiểm tra
đầu tiên trong mục "quyền đọc" của
[firestore.rules.test.ts](firestore.rules.test.ts) canh đúng điều đó.

Ba điểm đáng nhớ về cách sắp xếp này:

1. **Danh sách trong [src/lib/admins.ts](src/lib/admins.ts) không phải cái
   cổng.** Ai có tài khoản Google cũng đăng nhập xong được; danh sách ấy chỉ
   chọn màn hình để vẽ. Thứ từ chối một tài khoản lạ là `isAdmin()` trong
   rules. Đừng bao giờ để một quyết định thật sự nào dựa vào bản chép phía
   trình duyệt.
2. **Địa chỉ không công bố không phải lớp bảo vệ.** Không có gì trỏ tới
   `/ir-form/dashboard/` và nó mang `noindex`, nhưng đó là để sinh viên không
   thấy một cánh cửa họ không mở được — không phải để giấu.
3. **Thêm người thứ ba là sửa hai nơi rồi `npm run deploy:rules`.** Không có bộ
   sưu tập admin, không có custom claims. Ở mức hai người thì đó là đánh đổi
   đúng; quanh mức năm người thì chuyển sang custom claims, đừng kéo dài danh
   sách. Hai bản chép lệch nhau thì triệu chứng rất êm — một người quản trị
   lặng lẽ không đọc được gì — nên `firestore.rules.test.ts` đọc thẳng tệp
   rules ra để so.

Trang quản trị **không sửa** đơn nào: `allow update` vẫn đóng. Nó xóa được, và
việc xóa là không hoàn lại — xem [Lấy dữ liệu về](#lấy-dữ-liệu-về).

Điều quan trọng nhất phải hiểu về App Check: nó trả lời câu **"yêu cầu này có
đến từ ứng dụng của mình, chạy trên tên miền của mình không"**, chứ không phải
**"người này là ai"**. Trên web thì bằng chứng là một điểm số reCAPTCHA —
*có vẻ là người thật trong một trình duyệt thật*.

Ba hệ quả:

1. **Rules không nhìn thấy App Check.** Với Cloud Firestore, việc cưỡng chế là
   một công tắc trong Firebase console (App Check → APIs → Cloud Firestore →
   Enforce). Không có `request.app` trong `firestore.rules`; biến đó chỉ tồn
   tại trong callable Cloud Functions. App Check là cái cổng đứng trước *toàn
   bộ* API Firestore, không phải một điều kiện viết được trong rules.
2. **Ai cũng nộp được đơn dưới bất kỳ cái tên nào.** Không lớp nào trong thiết
   kế này ngăn điều đó. Lớp kiểm tra thật của bộ môn là họ biết sinh viên của
   mình, và sinh viên phải đến tận nơi.
3. **Không bài kiểm tra nào phủ được App Check.** Emulator bỏ qua nó, nên
   `npm test` xanh **không** nói gì về việc cổng đó có đang bật hay không.
   Chỗ duy nhất quan sát được là Firebase console → App Check → Cloud
   Firestore.

Đổi lại điều gì: token Entra ngày trước chứng minh người nộp có tài khoản của
trường. Không gì thay thế nó. Bù lại, không sinh viên nào còn bị chặn ở một
màn hình đăng nhập do thư mục ta không kiểm soát — đúng thứ đã giết cả hai bản
kế hoạch trước.

Đánh đổi đó chấp nhận được cho ứng dụng này. Một lá đơn giả tốn của bộ môn một
suất máy, phát hiện ra ngay lúc sinh viên không đến — nó không phải một vụ lộ
dữ liệu.

### Những gì thiết kế này *không* chữa

- **Không có giới hạn tần suất.** Đường ghi không có danh tính nên không viết
  được trong rules. App Check làm việc nhồi tự động trở nên khó, không phải
  bất khả, và không làm gì được một người bấm gửi 200 lần. Cảnh báo ngân sách
  Firestore là cách *phát hiện*, không phải cách ngăn.
- **Dấu vết mỏng đi.** Đơn không mang `uid`, không mang email đã xác thực. Một
  lá đơn chỉ có những gì ai đó gõ vào, cộng một dấu thời gian của máy chủ.
  Trang quản trị không đổi điều này: danh tính ở đó thuộc về *người đọc*, không
  phải người nộp.
- **Xóa là xóa hẳn.** Trang quản trị xóa được nhiều đơn một lúc, và không có
  trường xóa mềm, không có bản sao lưu, không có nút hoàn tác. Hộp thoại xác
  nhận là toàn bộ lớp chắn.
- **Tên giảng viên hướng dẫn cũng chỉ là lời khai.** Ô này từng là danh sách
  đóng gồm đúng một người; nay sinh viên tự gõ, vì mỗi khóa luận một người
  hướng dẫn khác và sửa mã nguồn cho từng người là không kham nổi. Không gì
  kiểm tra được cái tên đó — nhưng lá đơn là giấy, sinh viên tự mang đi xin
  chữ ký, nên người hướng dẫn thấy tên mình sai là biết ngay.
- **Token App Check phát lại được.** Một token lấy từ phiên trình duyệt thật
  dùng được tới khi hết hạn (~1 giờ). Chống phát lại chỉ có với backend riêng
  gọi `consumeAppCheckToken`, tức là cần một máy chủ mà ta không có.
- **reCAPTCHA chấm điểm, và nó chấm thấp một số người dùng thật.** Trình
  duyệt riêng tư, tiện ích chặn quảng cáo, vài mạng công ty. Khi đã bật cưỡng
  chế thì những sinh viên đó lặng lẽ không nộp được đơn và sẽ báo là "trang bị
  hỏng".

Nếu chỗ nào trong danh sách trên thành vấn đề thật, lối thoát nhỏ nhất là
**đăng nhập ẩn danh cho trang nộp đơn**: `signInAnonymously()` chạy vô hình lúc
mở trang, không sinh viên nào thấy màn hình đăng nhập, mà `request.auth.uid`
thì có mặt — đủ để chặn theo tần suất từng uid. Nó không đòi đổi mô hình dữ
liệu. (Firebase Auth nay đã có sẵn trong dự án cho trang quản trị, nhưng đừng
vì thế mà import nó vào gói của sinh viên trước khi thật sự cần — xem
`npm run check:bundle`.)

### Cấu hình web của Firebase không phải bí mật

`apiKey`, `projectId` nằm trong gói JavaScript gửi xuống trình duyệt, và như
vậy là đúng. Chúng là **định danh dự án, không phải khóa** — riêng cái tên
`apiKey` là do Google đặt nhầm. Khóa **site** của reCAPTCHA cũng công khai
theo đúng thiết kế: reCAPTCHA không chạy được nếu nó không nằm trong trang.

Vì thế CI truyền chúng qua *variables* chứ không phải *secrets*. Bí mật thật
sự duy nhất là khóa service account — `FIREBASE_SERVICE_ACCOUNT` trong CI, và
tệp JSON mà `npm run export:csv` dùng tại máy. Không cái nào tới trình duyệt.

### Rules có bài kiểm tra riêng

[firestore.rules.test.ts](firestore.rules.test.ts) chạy trên emulator Firestore
*và* emulator Auth qua `@firebase/rules-unit-testing`, phủ 34 trường hợp.

Về đường ghi: đơn hợp lệ ghi được, ID tài liệu sai dạng, `createdAt` lấy từ
đồng hồ máy khách, 0 / 60 / 61 mẫu, thiếu trường, thừa trường, trường `uid` của
bản cũ, ghi lần hai, sửa, xóa.

Về đường đọc — phần thêm cùng trang quản trị: máy khách chưa đăng nhập không
đọc và không liệt kê được; một tài khoản Google **ngoài** danh sách trắng cũng
không, kể cả khi nó đã đăng nhập trót lọt; đúng địa chỉ nhưng `email_verified`
sai thì cũng không; cả hai địa chỉ trong danh sách trắng thì `get`, `list` và
`delete` được, còn `update` thì vẫn không; và một người quản trị cũng không ghi
nổi một tài liệu sai hình dạng. Cộng một bài đọc thẳng tệp rules ra để so danh
sách trắng với [src/lib/admins.ts](src/lib/admins.ts).

Bộ này chạy trong `npm test` và trong CI. **Nó không nói gì về App Check** —
xem đầu tệp.

## Hình dạng dữ liệu

Mỗi lần nộp là **một tài liệu**, khóa chính là mã hồ sơ:

```
submissions/{maHoSo}
  maHoSo       string     trùng ID tài liệu, dạng IR-YYYYMMDD-XXXXXX
  createdAt    timestamp  giờ máy chủ, rules đòi đúng request.time
  email        string     sinh viên tự gõ
  studentName, studentId, phone, className, cohort,
  department, supervisor, city                string
  requestDate  string     YYYY-MM-DD
  samples      array      [{ name, state, solvent }]
```

`supervisor` là **một chuỗi đã ghép** — "Thầy PGS. TS. Trần Văn Thành". Màn
hình nhập chia nó thành ba ô (xưng hô, học hàm học vị, tên) nhưng đó là quyết
định về giao diện: ba ô ấy ghép lại ngay trong `validateForm` và không có ô
nào đi tiếp. Giữ nguyên như vậy là có chủ đích — `scripts/export-csv.ts` dựng
lại từng đơn đã lưu bằng chính `formSchema`, nên nếu schema đòi ba ô rời thì
mọi đơn đang nằm trong Firestore sẽ trượt kiểm tra và bị xuất ra thành dòng
trống.

**Khóa theo `maHoSo` làm cho việc ghi trở nên bất biến theo thiết kế.** Rules
chỉ cho `create`, nên một mã hồ sơ không thể có tài liệu thứ hai — không cần
quét bảng dò trùng như bản cũ. Dạng của ID nay do rules ép: hồi còn đăng nhập
thì ID coi như đáng tin vì chỉ sinh viên đã xác thực mới ghi được, còn nay thì
ai cũng tự đặt được.

Đơn nộp thời sinh viên còn đăng nhập vẫn giữ trường `uid` của chúng. Không di
trú: script xuất CSV bỏ qua khóa lạ, và trang quản trị cũng vậy — nó đọc từng
ô nó cần chứ không đòi tài liệu đúng hình dạng, nên một đơn cũ vẫn hiện ra
nguyên vẹn trong bảng thay vì biến mất.

### Bẫy gửi lại

Rules chỉ cho `create`, nên một lần gửi lại **thật sự chính đáng** — sau khi
mất phản hồi mạng — sẽ bị từ chối, dù lần trước đã ghi được.

Bản cũ trả lời câu "đơn này đã là của tôi chưa" bằng cách đọc lại tài liệu.
Không còn đường đọc nào, nên [src/lib/submissions.ts](src/lib/submissions.ts)
suy ra từ lịch sử các lần bấm:

- `permission-denied` chỉ có hai nguyên nhân: tài liệu đã tồn tại, hoặc nội
  dung sai hình dạng.
- Nội dung sai hình dạng thì hỏng **ngay ở lần bấm đầu**, trong vài chục mili
  giây, không qua timeout nào.

Vậy `permission-denied` **sau** một lần hỏng không kết luận được (timeout,
`unavailable`, lỗi lạ) nghĩa là chính ta đã ghi được từ trước → đi tiếp tới
màn hình xác nhận. `permission-denied` ở lần bấm đầu là từ chối thật → báo lỗi.

Chính vì thế **mã hồ sơ được nới từ bốn lên sáu ký tự**: hai trình duyệt trùng
mã trong cùng một ngày sẽ khiến lá đơn thứ hai biến mất không một tiếng động
thay vì báo lỗi. `32^6 ≈ 1,07 tỷ` tổ hợp mỗi ngày làm chuyện đó thôi là một
khả năng đáng nghĩ tới.

Chỗ suy luận này còn một khe hở, ghi ra cho sòng phẳng: lần bấm đầu hỏng vì
mạng rồi lần sau bị App Check từ chối thì ứng dụng báo thành công cho một lá
đơn chưa hề được ghi. Không đọc lại được tài liệu thì không phân biệt được.

## Lấy dữ liệu về

Hai đường, và chúng phục vụ hai việc khác nhau.

### Trang quản trị — xem, tra cứu, xóa

`/ir-form/dashboard/`, đăng nhập bằng Google. Không có gì trỏ tới nó và nó mang
`noindex`; muốn vào thì gõ thẳng địa chỉ. Chỉ hai địa chỉ trong
[src/lib/admins.ts](src/lib/admins.ts) mở được — xem
[Bảo mật](#bảo-mật--đọc-trước-khi-sửa-firestorerules) để hiểu vì sao danh sách
ấy chỉ là giao diện còn cái cổng nằm trong rules.

Ba tab:

| Tab | Việc |
| --- | --- |
| **Overview** | Bốn biểu đồ theo năm: số đơn từng tháng, trạng thái mẫu, xếp hạng lớp, tần suất giảng viên |
| **Records** | Toàn bộ đơn — sắp mới/cũ, lọc theo năm và tháng, mở từng dòng xem danh sách mẫu, xóa theo ô chọn, nhập tay một đơn |
| **Lookup** | Tra theo một phần họ tên, mã số sinh viên, lớp, email, giảng viên |

Vài điều đáng biết trước khi dùng:

- **Trang đọc cả bộ sưu tập đúng một lần lúc đăng nhập**, rồi mọi thao tác chạy
  trong bộ nhớ. Firestore không so khớp chuỗi con ở bất kỳ mức chỉ mục nào, nên
  tra cứu theo một phần tên *chỉ* làm được như vậy. Trần là 5000 đơn; chạm trần
  thì có một băng cảnh báo, và phần bị cắt là những đơn **mới nhất** — lý do
  nằm ở đầu [src/dashboard/lib/records.ts](src/dashboard/lib/records.ts).
- **Xóa là xóa hẳn.** Không hoàn tác, không sao lưu. Muốn giữ một bản thì chạy
  `npm run export:csv` trước.
- **Không sửa được đơn nào** — cố ý, và `allow update` trong rules canh điều đó.
- **Đơn nhập tay** đi qua đúng `formSchema` và đúng `allow create` mà sinh viên
  đi, nên nó giống hệt một đơn thật về hình dạng. Mã hồ sơ sinh từ *ngày ghi
  trên tờ đơn*, còn `createdAt` là lúc gõ vào — mọi biểu đồ và bộ lọc đọc
  `requestDate` nên khác biệt đó không lộ ra ở đâu ngoài thứ tự sắp xếp.
- **Biểu đồ giảng viên gộp Thầy/Cô về một người, nhưng không gộp học hàm học
  vị**: `TS. X` và `PGS. TS. X` vẫn là hai cột. Cố ý — so khớp mờ theo tên có
  ngày gộp nhầm hai người thật, và một cột thừa đọc ra được thì tốt hơn.

Chạy thử tại máy thì cần cả emulator Auth (`npm run emulators` đã bật sẵn):
emulator cho đăng nhập bằng bất kỳ địa chỉ nào gõ vào, nên thử được cả hai phía
của danh sách trắng.

### Xuất CSV — lấy một bản sao

[scripts/export-csv.ts](scripts/export-csv.ts), chạy tại máy người phụ trách.
Đây vẫn là cách duy nhất **mang dữ liệu ra khỏi** Firestore, và là thứ phải
chạy trước khi xóa bất cứ gì:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/toi/khoa.json
export FIREBASE_PROJECT_ID=formhelper-1f657
npm run export:csv                    # → don-thiet-bi-YYYYMMDD.csv
npm run export:csv -- bao-cao.csv     # hoặc chỉ định tên file
```

Thử trước mà không cần khóa: bật `npm run emulators` rồi

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run export:csv -- thu.csv
```

Khóa lấy ở Firebase console → Project settings → Service accounts → *Generate
new private key*. `firebase-admin` xác thực bằng service account nên nó đi
vòng qua **cả rules lẫn App Check** — kể cả danh sách trắng của trang quản trị,
thứ nó không hề biết tới. Lòng tin nằm ở đúng một tệp JSON trên đúng một máy.
Tệp đó không bao giờ được vào kho mã; `.gitignore` chặn sẵn cả nó lẫn các file
`.csv` xuất ra.

File CSV có BOM UTF-8 để Excel trên Windows mở bằng nhấp đúp không ra
"Nguyá»…n", và ô được bọc nháy đúng RFC 4180 nên dấu phẩy trong tên mẫu được
giữ nguyên — bản Apps Script cũ xóa chúng đi, tức là sửa nội dung của người ta
mà không báo.

Mỗi tài liệu đọc lên đều đi qua `formSchema` một lần nữa, y như
[src/lib/session.ts](src/lib/session.ts) làm với `sessionStorage`. Việc này nay
**quan trọng hơn trước**: rules chỉ chốt được kiểu, kích thước và số lượng mẫu,
và không còn danh tính nào đứng sau nội dung. Đơn không đọc được vẫn nằm trong
bản xuất, chỉ thiếu vài cột, và script in ra một dòng cảnh báo — giấu đi thì bộ
môn mất một lá đơn mà không hề biết.

Dựng lại PDF cho một đơn đã nộp thì hiện không có. `scripts/preview-pdf.ts`
đã dựng PDF từ `FormValues` ngoài trình duyệt, nên nếu bộ môn cần thì đó là
một script nhỏ chứ không phải xây lại từ đầu.

## Thiết lập lần đầu

Những bước dưới đây phải làm trên console, không tự động hóa được.

### 1. Dự án Firebase

1. Tạo dự án mới và bật **Firestore** ở chế độ production.
2. Bật **Authentication** — chỉ trang quản trị cần, và chỉ một nhà cung cấp:
   - Sign-in method → bật **Google**.
   - Settings → Authorized domains → thêm `ump.ngthinh.com`. Thiếu bước này
     thì cửa sổ đăng nhập bị từ chối trên tên miền thật, trong khi chạy ở máy
     vẫn tốt.
3. Chép cấu hình web ở **Project settings → Your apps → Web** vào `.env`
   (xem [.env.example](.env.example)) và vào *Variables* của repo.
   `VITE_FIREBASE_AUTH_DOMAIN` là ô mới và **chỉ trang quản trị dùng tới**:
   cửa sổ đăng nhập mở `https://<authDomain>/__/auth/handler`, thiếu nó thì bấm
   nút không thấy gì xảy ra.
4. Sửa danh sách trong [src/lib/admins.ts](src/lib/admins.ts) *và* `isAdmin()`
   trong [firestore.rules](firestore.rules) cho khớp địa chỉ của bộ môn. Hai
   nơi, và `npm test` canh chúng khớp nhau.
5. Điền ID dự án vào [.firebaserc](.firebaserc), hoặc chạy
   `npx firebase use --add`.

### 2. App Check với reCAPTCHA Enterprise

1. Tạo khóa reCAPTCHA **Enterprise** loại *score-based* cho web, và khai **mọi
   tên miền phục vụ ứng dụng** — `ump.ngthinh.com`, cộng
   `<project>.web.app` và `<project>.firebaseapp.com` nếu chúng còn truy cập
   được. **Thiếu một tên miền ở đây là ứng dụng chết hoàn toàn trên tên miền
   đó.** Đường dẫn không khai được: reCAPTCHA chỉ biết tới tên miền.
2. Firebase console → **App Check** → đăng ký ứng dụng web với khóa đó. Khóa
   này cũng chính là `VITE_RECAPTCHA_SITE_KEY`.

   **Khóa Enterprise không có secret key.** Cặp site key + secret key là của
   reCAPTCHA v3; Enterprise chỉ có một khóa duy nhất, công khai, nằm trong
   trang. Không có gì phải giấu ở bước này.

   Và phải khớp: `ReCaptchaEnterpriseProvider` trong
   [src/lib/firebase.ts](src/lib/firebase.ts) đi với khóa Enterprise,
   `ReCaptchaV3Provider` đi với khóa v3. Lắp lệch thì không có triệu chứng nào
   cho tới lúc bật cưỡng chế, rồi mọi lá đơn bị từ chối.
3. **Để cưỡng chế tắt.** Triển khai, rồi theo dõi App Check → Cloud Firestore
   cho tới khi tỉ lệ *verified* gần 100% và *outdated client* gần 0. Đợi một
   ngày lưu lượng thật, không phải mười phút tự bấm.
4. Bật cưỡng chế. Ngay sau đó nộp thử một đơn thật từ điện thoại dùng mạng di
   động, và mở sẵn tab console: thấy *unverified* vọt lên thì tắt lại — đó là
   một công tắc, tắt lại là tức thì.

### 3. Cảnh báo ngân sách

Không có danh tính thì không có giới hạn tần suất ở bất cứ đâu trong thiết kế
này. Một trận nhồi đơn nay là một sự kiện **hóa đơn** chứ không phải một sự
kiện bảo mật, nên đặt cảnh báo ngân sách cho Firestore và coi đó là cơ chế
phát hiện.

## Triển khai lên Firebase Hosting

Ứng dụng nằm tại **`ump.ngthinh.com/ir-form/`**, một trong nhiều công cụ dưới
trang chủ `ump.ngthinh.com`.

### Kho mã riêng, triển khai riêng

Trang chủ và từng công cụ nằm ở **kho mã riêng biệt, triển khai độc lập với
nhau**. Firebase Hosting một mình không làm được điều đó — `firebase deploy
--only hosting` thay *toàn bộ* nội dung của một site bằng thư mục `dist`, nên
hai kho mã cùng đẩy lên một site sẽ xóa lẫn nhau. Không có kiểu deploy chỉ một
nhánh đường dẫn.

Nên trước chúng có một **reverse proxy** (Cloudflare Worker trên
`ump.ngthinh.com/*`). Mỗi ứng dụng giữ Hosting site riêng và quy trình deploy
riêng; proxy chỉ quyết định đường dẫn nào do site nào trả lời:

```
ump.ngthinh.com/            → site của trang chủ
ump.ngthinh.com/ir-form/*   → site của ứng dụng này (formhelper-1f657.web.app)
ump.ngthinh.com/<tool>/*    → site của công cụ khác
```

Proxy **chuyển tiếp nguyên đường dẫn, không cắt bỏ tiền tố**. Nhờ vậy bảng
định tuyến chỉ là một danh sách, và quan trọng hơn: cùng một URL chạy được cả
qua proxy lẫn khi mở thẳng `<project>.web.app/ir-form/` — thứ cần có mỗi khi
phải phân biệt "lỗi ở ứng dụng" với "lỗi ở proxy".

Bảng định tuyến nên sống trong kho mã của **trang chủ**: nó vốn đã phải biết
danh sách công cụ để hiện liên kết, nên thêm một công cụ là sửa đúng một chỗ.

### Bốn nơi phải cùng nói một đường dẫn

Lệch một nơi là trang trắng hoặc nút "Tải PDF" hỏng:

| Chỗ | Giá trị |
| --- | --- |
| `base` trong [vite.config.ts](vite.config.ts) | `/ir-form/` |
| `build.outDir` cùng file | `dist/ir-form` |
| `trailingSlash` trong [firebase.json](firebase.json) | `true` — chốt `/ir-form/` là dạng chuẩn |
| Bảng định tuyến của proxy | `/ir-form` → site này |

`firebase.json` còn một dòng `redirects` nữa: `/` → `/ir-form/`. Nó chỉ có tác
dụng khi mở thẳng `<project>.web.app`, để gốc của site không phải một ngõ cụt
lúc dò lỗi. Qua proxy thì `/` đã do trang chủ trả lời, không bao giờ chạm tới
đây.

**Đừng thêm lại `redirects` dạng `/ir-form` → `/ir-form/`.** Nó từng có trong
`firebase.json` và đã làm sập site: khi so khớp `source`, Firebase Hosting bỏ
gạch chéo cuối, nên `/ir-form/` cũng khớp luôn `source: "/ir-form"` và bị đẩy
về chính nó — vòng lặp 301 vô tận, mọi địa chỉ đều không mở được. Việc thêm
gạch chéo giờ do `trailingSlash: true` lo, và nó xử lý ở tầng phân giải tệp
chứ không phải tầng `redirects`, nên không tự khớp lại.

`base` là đường dẫn **tuyệt đối** chứ không phải `./` như bản trước. Với `./`
thì địa chỉ được phân giải theo URL đang mở, nên ai gõ thiếu dấu gạch cuối sẽ
làm `fonts/` trỏ về gốc tên miền — tức là sang trang chủ. Trang vẫn hiện, chỉ
có nút "Tải PDF" chết, đúng loại lỗi mà người xây dựng không bao giờ gặp vì họ
luôn mở đúng địa chỉ. `trailingSlash: true` bịt nốt trường hợp đó ở phía máy
chủ: ai gõ thiếu gạch cuối sẽ bị đẩy về `/ir-form/` trước khi trang kịp tải.

### Cái giá của việc dùng chung một tên miền

**Đường dẫn không phải là một ranh giới.** reCAPTCHA và App Check chỉ biết tới
*tên miền*: khai `ump.ngthinh.com` là xong cho mọi công cụ, và không khai
riêng `/ir-form/` được. Cùng lý do đó, mọi công cụ dùng chung một
localStorage — khóa của ứng dụng này đều mang tiền tố `don-thiet-bi:`, và một
lỗ XSS ở bất kỳ công cụ nào cũng đọc được dữ liệu của công cụ khác. Đó là cái
giá đổi lấy đường dẫn đẹp; tên miền phụ riêng cho từng công cụ thì không có
vấn đề này nhưng cũng không có trang chủ chung.

### Các bước

1. Vào **Settings → Secrets and variables → Actions** của repo:
   - *Variables*: `VITE_FIREBASE_*` và `VITE_RECAPTCHA_SITE_KEY`.
   - *Secrets*: `FIREBASE_SERVICE_ACCOUNT` — nội dung JSON của một service
     account có đủ bốn vai trò IAM:

     - **Firebase Hosting Admin** (`roles/firebasehosting.admin`) — đẩy bản dựng.
     - **Firebase Rules Admin** (`roles/firebaserules.admin`) — đẩy `firestore.rules`.
     - **Cloud Datastore Owner** (`roles/datastore.owner`) — đọc database và
       chỉ mục hiện có để so sánh trước khi triển khai.
     - **Service Usage Consumer** (`roles/serviceusage.serviceUsageConsumer`)
       — vai trò dễ quên nhất. Trước khi đụng tới `firestore`,
       `firebase deploy` hỏi Service Usage xem `firestore.googleapis.com` đã
       bật chưa. Thiếu vai trò này thì lệnh chết ngay ở câu hỏi đó —
       `HTTP Error: 403, Permission denied to get service` — khi chưa đẩy gì
       lên. Không có cờ nào bỏ qua bước kiểm tra ấy, và thu hẹp thành
       `--only hosting,firestore:rules` cũng không thoát: nó chạy trước khi
       firebase-tools nhìn tới `--only`.

     Mỗi vai trò cấp bằng một lệnh, `--member` lấy từ trường `client_email`
     trong khóa JSON:

     ```sh
     gcloud projects add-iam-policy-binding formhelper-1f657 \
       --member=serviceAccount:<client_email> \
       --role=roles/serviceusage.serviceUsageConsumer
     ```
2. Đẩy code lên nhánh `main`.
   [Workflow](.github/workflows/deploy.yml) chạy kiểm tra, dựng, rồi triển
   khai **cả hosting lẫn `firestore.rules`** trong một bước — để rules không
   bao giờ lệch phiên bản với mã nguồn đang chạy.

Bước gộp ấy quan trọng nhất đúng ở lần phát hành này: rules mới từ chối tài
liệu có `uid`, còn gói JavaScript cũ thì vẫn gửi `uid`. Lệch phiên bản là mọi
lá đơn hỏng.

`ump.ngthinh.com` phải nằm trong danh sách tên miền của khóa reCAPTCHA — đó là
tên miền trình duyệt đang mở, thứ duy nhất reCAPTCHA nhìn thấy. Thêm cả
`<project>.web.app` nếu muốn mở thẳng site để dò lỗi.

**Không** thêm `ump.ngthinh.com` vào *Hosting → Add custom domain* của
Firebase: tên miền nằm ở proxy, còn Firebase chỉ phục vụ origin `.web.app`.
Làm cả hai là thừa và làm rối DNS.

Một chỗ phải kiểm sau khi đấu nối proxy: gõ `ump.ngthinh.com/ir-form` (thiếu
gạch cuối) và xem header `Location` trả về. Nó phải là đường dẫn tương đối
`/ir-form/`; nếu Firebase trả về địa chỉ tuyệt đối kèm `.web.app` thì trình
duyệt nhảy khỏi tên miền giữa chừng.

Ràng buộc "phải ở Firebase Hosting" của bản cũ — luồng OAuth qua
`<project>.firebaseapp.com/__/auth/handler` — đã đi cùng với đăng nhập.

## Giao diện

Toàn bộ giao diện dựng theo hệ thiết kế **classical** (bản `IR Form
(refined)` trên claude.ai/design): giấy màu ngà, chữ có chân — Cormorant
Garamond cho tiêu đề, Lora cho phần chữ chạy — điểm nhấn màu đồng, nút viền
rỗng thay vì nút đặc màu. Ba màn hình nằm trong cùng một khung giấy; tiêu đề
mục xếp ở cột trái rộng 210px, nội dung bên phải; vạch tiến độ ba nét và cặp
số "01 / 03" nằm ở góc phải thanh tiêu đề, riêng màn hình cuối thì chỗ đó là
mã hồ sơ.

Tất cả nằm trong [src/styles/index.css](src/styles/index.css) — một file,
không thư viện CSS, không bước dựng riêng.

Bốn chỗ cố ý lệch khỏi bản vẽ, đều có lý do:

| Chỗ lệch | Vì sao |
| --- | --- |
| Ô nhập 16px, nút cao 44px trên màn hình hẹp (bản vẽ để 14px / 36px) | Dưới 16px thì iOS tự phóng to cả trang lúc gõ. 44px là bề ngang đầu ngón tay. |
| Lưới hai cột gập lại thành một cột dưới 820px | Bản vẽ chỉ có khung 1040px. Phần lớn sinh viên mở bằng điện thoại. |
| Chữ trên nút và dấu `*` dùng đồng sẫm `#7d5411`, không phải đồng `#b68235` | Màu đồng chỉ đạt 3:1 trên nền giấy — đủ cho nét vẽ, không đủ cho chữ. Viền, vạch, số thứ tự vẫn giữ màu đồng, nên nhìn vẫn là một màu. |
| Số đếm dùng `lining-nums` thay cho `tnum` đơn thuần | Cormorant Garamond mặc định vẽ số kiểu cổ, "01 / 03" đọc ra thành "oi / o3". |

Hệ thiết kế gốc không có màu báo lỗi — nó chỉ có màu đồng và màu trung tính.
Ba màu đỏ gạch trong `--color-danger*` là phần thêm, chọn theo cùng gam ấm.

**Chữ trên màn hình lấy đúng từ bản vẽ, không thêm chữ nào.** Bản vẽ để cột
trái chỉ có tiêu đề mục, ô nhập chỉ có nhãn và một hai câu nhắc thật ngắn —
giữ đúng như vậy. Chỗ duy nhất có chữ không nằm trong bản vẽ là những trạng
thái mà bản vẽ không vẽ tới: câu báo lỗi cạnh ô sai, băng "chưa gửi được
đơn", nhãn lúc đang chờ ("Đang gửi…"), nhãn cho trình đọc màn hình, và nút
`[dev] Xem thử PDF` chỉ có khi chạy `npm run dev`.

Hai phông tải từ Google Fonts (khai trong [index.html](index.html)) và **không
liên quan gì tới file PDF**: PDF nhúng Libertinus thẳng vào tệp. Mạng chặn
Google Fonts thì trang chỉ đổi dáng chữ sang phông dự phòng, đơn in ra vẫn y
nguyên.

## Phông chữ

Đơn được đặt bằng **Libertinus**, phát hành theo giấy phép SIL Open Font
License 1.1 (`public/fonts/OFL.txt`) — dùng, sửa và phát hành kèm ứng dụng đều
được, miễn là bản giấy phép đi cùng bộ phông và không đem bán riêng bộ phông.

Google Fonts chia họ Libertinus thành nhiều dự án, và **Libertinus Math chỉ có
đúng một kiểu Regular** — không bold, không italic. Đơn thì cần cả ba, nên bốn
ô của pdfmake được lấp thế này:

| Kiểu | File |
| --- | --- |
| normal | `LibertinusMath-Regular.ttf` |
| bold | `LibertinusSerif-Bold.ttf` |
| italics | `LibertinusSerif-Italic.ttf` |
| bolditalics | `LibertinusSerif-SemiBoldItalic.ttf` |

Ghép hai dự án không để lại vết nối vì bên dưới vẫn là một chữ: cùng em 1000
đơn vị, cùng chiều cao chữ hoa 658 và chiều cao chữ thường 429, và 65 trên 81
chữ Latin + tiếng Việt đem so là **trùng khít từng đường nét, cùng bề rộng**.
Math chỉ vẽ lại vài glyph mà công thức toán cần rộng hơn (J f j và cặp ngoặc).

Ô `bolditalics` cố tình lệch nhịp: `LibertinusSerif-BoldItalic` **thiếu đúng
bốn chữ ơ ư Ơ Ư** — bốn chữ mà đơn này không thể thiếu ("Bộ môn Hóa Hữu Cơ",
"sử dụng"). SemiBoldItalic đủ tiếng Việt nên nó giữ ô đó. Hiện chưa chỗ nào
vừa đậm vừa nghiêng; đây là lưới an toàn cho ngày có.

Bốn file đã cắt gọn còn Latin + tiếng Việt + Hy Lạp + ký hiệu toán (3,7 MB
xuống còn khoảng 720 KB). Giữ lại Hy Lạp và ký hiệu là có chủ đích: sinh viên
gõ tên mẫu vào bảng, và β-cyclodextrin hay CaCO₃ → CaO không được ra ô vuông
trắng.

Không phải tin bài viết này: `src/lib/pdf/fonts.test.ts` đọc thẳng bảng `cmap`
của bốn file thật trong `public/fonts/` và bắt lỗi nếu thiếu bất kỳ chữ cái
tiếng Việt, ký tự ASCII hay ký hiệu hóa học nào.

Dựng lại phông (cần `pip install fonttools brotli`):

```bash
./scripts/build-fonts.sh
```

### Máy người xem không cần cài phông

pdfmake nhúng thẳng phần phông đã dùng vào file PDF (subset, dạng Type0/CID).
Sinh viên tải file về là xem và in được ở bất kỳ máy nào, kể cả máy chưa từng
nghe tới Libertinus, và chữ vẫn bôi–chép–tìm được. Kiểm lại bằng:

```bash
npx tsx scripts/preview-pdf.ts preview/don-mau.pdf
```

rồi mở file và xem *Thuộc tính → Phông chữ*: cả ba kiểu phải ghi *Embedded
Subset*.

Chỗ duy nhất còn hỏng được là lúc **dựng** file: trình duyệt phải tải bốn file
`.ttf` từ `public/fonts/`. Tải hụt thì không có PDF nào ra đời cả — màn hình
báo lỗi và lần bấm sau thử lại từ đầu — chứ không có chuyện ra một file PDF
thiếu chữ.

## Bố cục file PDF

Dựng theo bản thiết kế ở [docs/don.html](docs/don.html): khổ A4, lề trên,
phải, dưới 2 cm, **lề trái 3 cm** để chừa chỗ đóng ghim, chữ 13 pt.

Đơn ngắn nằm gọn một trang. Đơn dài tự sang trang mới, hàng tiêu đề của bảng
được lặp lại, không dòng mẫu nào bị cắt ngang trang, và hai ô chữ ký luôn đi
liền một khối. Đếm số trang theo số mẫu:

```bash
npx tsx scripts/check-pagination.ts
```

Một chỗ dễ sai: `line-height` của CSS **không bê thẳng sang pdfmake được**.
CSS nhân với cỡ chữ, pdfmake nhân với chiều cao tự nhiên của phông (Libertinus
cao 1,14 em). Để nguyên 1,4 thì mỗi dòng dôi 2,5 pt, cộng dồn hơn ba mươi dòng
là đủ đẩy khối chữ ký sang trang thứ hai ngay cả với đơn ba mẫu — nên hằng số
trong `docDefinition.ts` viết là `1.4 / 1.14`.

Ngày tháng nằm ở cột phải đầu đơn, ngay dưới dòng "Độc lập - Tự do - Hạnh
phúc", không còn ở cuối trang. Ô "Xác nhận của bộ môn" đã bỏ.

Mã hồ sơ được in nhỏ màu xám ở góc **dưới bên trái mọi trang**, cách mép giấy
1 cm — nằm trong phần lề nên không đụng vào nội dung.

## Cấu trúc thư mục

```
index.html               Điểm vào của trang nộp đơn
dashboard/index.html     Điểm vào của trang quản trị (noindex)
firestore.rules          Một nửa ranh giới bảo mật — đọc trước khi sửa
firestore.rules.test.ts  Bài kiểm tra cho nó (App Check thì không có bài nào)
public/fonts/            Phông Libertinus đã cắt gọn + giấy phép
scripts/export-csv.ts    Xuất CSV tại máy bằng service account
scripts/submissionRows.ts  Đọc tài liệu thành dòng + dựng CSV (có bài kiểm tra)
scripts/check-bundle.ts  Canh gói sinh viên không lẫn firebase/auth và recharts
scripts/                 Dựng phông, xem thử PDF, đếm số trang

src/lib/                 Dùng chung cho cả hai trang
  firebase.ts            Khởi tạo Firebase và App Check — **không import auth**
  admins.ts              Danh sách trắng (bản chép của rules, không có thẩm quyền)
  submissions.ts         Ghi đơn vào Firestore + bẫy gửi lại
  maHoSo.ts              Sinh mã hồ sơ (dạng do firestore.rules ép)
  schema.ts              Định nghĩa dữ liệu đơn — nguồn duy nhất
  pdf/                   Bố cục PDF và nạp phông
  storage.ts             Bản nháp và thông tin cá nhân (localStorage)
  session.ts             Đơn vừa gửi (sessionStorage)

src/screens/             Ba màn hình của sinh viên

src/dashboard/           Chỉ trang quản trị — không thứ gì ở đây vào gói sinh viên
  Dashboard.tsx          Cổng đăng nhập + khung ba tab
  lib/adminAuth.ts       Nơi *duy nhất* import firebase/auth
  lib/records.ts         Đọc một lượt, sắp xếp, lọc, tra cứu (có bài kiểm tra)
  lib/aggregate.ts       Bốn phép gộp của biểu đồ (có bài kiểm tra)
  lib/mutations.ts       Xóa theo lô + nhập tay một đơn
  tabs/, components/     Ba tab, bảng đơn dùng chung, biểu mẫu nhập tay
  charts/                Recharts + bảng màu đã qua kiểm tra mù màu

src/styles/index.css     Giao diện dùng chung (hệ thiết kế "classical")
src/styles/dashboard.css Phần riêng của trang quản trị
```

## Thay đổi thường gặp

- **Thêm cách xưng hô hoặc học hàm học vị cho giảng viên** — sửa
  `SUPERVISOR_HONORIFICS` / `SUPERVISOR_TITLES` trong
  [src/lib/constants.ts](src/lib/constants.ts). *Tên* giảng viên thì không cần
  sửa gì: nó là ô gõ tự do.
- **Đổi trạng thái mẫu cho phép** — sửa `SAMPLE_STATES` cùng file.
- **Đổi tên bộ môn hoặc thiết bị** — sửa `DEPARTMENT` / `EQUIPMENT` cùng file.
- **Đổi màu, cỡ chữ, khoảng cách của trang** — sửa các biến ở đầu
  [src/styles/index.css](src/styles/index.css); đừng rải giá trị cứng ra dưới.
- **Đổi tiêu đề cơ quan ở đầu đơn** — sửa `LETTERHEAD` / `SCHOOL` cùng file.
- **Đổi phông** — sửa `FACES` trong
  [scripts/build-fonts.sh](scripts/build-fonts.sh) và `LIBERTINUS_FAMILY`
  trong [src/lib/pdf/fonts.ts](src/lib/pdf/fonts.ts), chạy lại script, rồi
  chạy `npm test`: bài kiểm tra bảng `cmap` sẽ chặn nếu phông mới thiếu chữ
  tiếng Việt.
- **Thêm người vào trang quản trị** — sửa `ADMIN_EMAILS` trong
  [src/lib/admins.ts](src/lib/admins.ts) **và** danh sách trong `isAdmin()` của
  [firestore.rules](firestore.rules), rồi `npm run deploy:rules`. Hai nơi là cố
  ý: rules không import được JavaScript. Quên nơi thứ hai thì người mới đăng
  nhập được nhưng bảng dữ liệu trống trơn — `npm test` chặn trước khi tới đó.
  Quanh mức năm người thì chuyển sang custom claims thay vì kéo dài danh sách.
- **Thêm tên miền mới cho trang** — thêm vào khóa reCAPTCHA *trước* khi trỏ
  tên miền, nếu không App Check chặn sạch mọi lá đơn từ đó. Nếu tên miền đó
  phục vụ cả trang quản trị thì thêm nó vào **Authentication → Settings →
  Authorized domains** nữa, không thì cửa sổ đăng nhập bị từ chối.
- **Đổi màu biểu đồ** — sửa `src/dashboard/charts/theme.ts`, rồi chạy lại bộ
  kiểm tra bảng màu của kỹ năng `dataviz` (lệnh nằm sẵn trong phần đầu tệp).
  Ba màu hiện tại đã qua ngưỡng mù màu trên đúng nền giấy này; đổi bằng mắt là
  bỏ mất điều đó.
- **Đổi dạng mã hồ sơ** — sửa `MA_HO_SO_PATTERN` và `RANDOM_LENGTH` trong
  [src/lib/maHoSo.ts](src/lib/maHoSo.ts) *và* regex trong
  [firestore.rules](firestore.rules). Hai nơi là cố ý: rules không import được
  JavaScript. Bài kiểm tra trong `maHoSo.test.ts` giữ hai bản chép khớp nhau.
- **Chỉnh khoảng cách trong PDF** — các hằng số ở đầu
  [src/lib/pdf/docDefinition.ts](src/lib/pdf/docDefinition.ts), kiểm lại bằng
  `scripts/check-pagination.ts`.

Đơn hiện chỉ dùng cho FT-IR. Nếu sau này bộ môn thêm thiết bị khác thì
`docDefinition.ts` cần tách thành nhiều mẫu thay vì một hàm cố định.
