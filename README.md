# Đơn xin sử dụng thiết bị

Trang web giúp sinh viên điền và in đơn xin mượn **máy quang phổ hồng ngoại
(FT-IR)** của Bộ môn Hóa Hữu Cơ, đồng thời lưu mỗi lần nộp vào Firestore.

**Không có đăng nhập.** Sinh viên mở trang là điền được ngay. Luồng sử dụng
gồm ba màn hình:

1. **Điền đơn** — thông tin sinh viên và danh sách mẫu đo (thêm, xóa, nhân
   đôi, đổi thứ tự).
2. **Xem lại** — bản tóm tắt chỉ đọc, xếp đúng thứ tự như trong file PDF để dò
   từ trên xuống. Chưa có gì được gửi đi ở bước này.
3. **Hoàn tất** — hiện mã hồ sơ và nút tải file PDF khổ A4 để in và ký.

Không có gì được ghi vào cơ sở dữ liệu cho tới khi bấm **Xác nhận và gửi**, và
file PDF chỉ được dựng khi bấm **Tải PDF**.

Bộ môn lấy dữ liệu bằng `npm run export:csv`, chạy tại máy — xem
[Lấy dữ liệu về](#lấy-dữ-liệu-về). Không còn trang quản trị: sau lần thay đổi
này **không trình duyệt nào đọc được gì từ cơ sở dữ liệu.**

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
đầy đủ khi khởi động.

Emulator **bỏ qua App Check hoàn toàn**, và bản dev cũng không khởi tạo App
Check. Nghĩa là chạy tại máy không bao giờ chạm tới nửa kia của ranh giới bảo
mật — xem [Bảo mật](#bảo-mật--đọc-trước-khi-sửa-firestorerules).

Màn hình xem lại có thêm nút `[dev] Xem thử PDF` để kiểm tra bố cục mà không
phải gửi đơn thật. Khối này bị loại hẳn khỏi bản build.

## Các lệnh

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy máy chủ phát triển |
| `npm run emulators` | Chạy Firestore emulator cho bản dev |
| `npm run build` | Dựng bản phát hành vào `dist/` |
| `npm run preview` | Xem thử bản đã dựng |
| `npm test` | Chạy toàn bộ bài kiểm tra, kể cả `firestore.rules` |
| `npm run test:rules` | Chỉ chạy bài kiểm tra `firestore.rules` |
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
chúng ta đứng giữa, và cũng không còn đăng nhập. Hệ quả trực tiếp: `formSchema`
trong [src/lib/schema.ts](src/lib/schema.ts) chạy hoàn toàn trên máy người
dùng, nên nó giúp người điền đơn nhận ra lỗi chứ **không ngăn được ai**.

Còn đúng hai lớp, và chúng canh hai thứ khác nhau:

| Lớp | Chặn được | Không chặn được |
| --- | --- | --- |
| **App Check** (reCAPTCHA Enterprise) | script, bot, curl, trang khác gọi vào | một người thật ngồi trên đúng trang này |
| **[firestore.rules](firestore.rules)** | sai hình dạng, thừa khóa, ô quá dài, quá 60 mẫu, **mọi lượt đọc**, mọi lượt sửa, mọi lượt xóa, mọi bộ sưu tập khác | một lời khai hợp lệ nhưng sai sự thật |

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
suất máy, phát hiện ra ngay lúc sinh viên không đến. Nó không phải một vụ lộ
dữ liệu, vì sau thay đổi này **không trình duyệt nào đọc được gì.**

### Những gì thiết kế này *không* chữa

- **Không có giới hạn tần suất.** Không có danh tính thì không viết được trong
  rules. App Check làm việc nhồi tự động trở nên khó, không phải bất khả, và
  không làm gì được một người bấm gửi 200 lần. Cảnh báo ngân sách Firestore là
  cách *phát hiện*, không phải cách ngăn.
- **Dấu vết mỏng đi.** Không còn `uid`, không còn email đã xác thực. Một lá
  đơn nay chỉ mang những gì ai đó gõ vào, cộng một dấu thời gian của máy chủ.
- **Token App Check phát lại được.** Một token lấy từ phiên trình duyệt thật
  dùng được tới khi hết hạn (~1 giờ). Chống phát lại chỉ có với backend riêng
  gọi `consumeAppCheckToken`, tức là cần một máy chủ mà ta không có.
- **reCAPTCHA chấm điểm, và nó chấm thấp một số người dùng thật.** Trình
  duyệt riêng tư, tiện ích chặn quảng cáo, vài mạng công ty. Khi đã bật cưỡng
  chế thì những sinh viên đó lặng lẽ không nộp được đơn và sẽ báo là "trang bị
  hỏng".

Nếu chỗ nào trong danh sách trên thành vấn đề thật, lối thoát nhỏ nhất là
**đăng nhập ẩn danh**: `signInAnonymously()` chạy vô hình lúc mở trang, không
sinh viên nào thấy màn hình đăng nhập, mà `request.auth.uid` thì quay lại —
đủ để mở lại quyền đọc theo người gửi và để chặn theo tần suất từng uid. Nó
không đòi đổi mô hình dữ liệu.

### Cấu hình web của Firebase không phải bí mật

`apiKey`, `projectId` nằm trong gói JavaScript gửi xuống trình duyệt, và như
vậy là đúng. Chúng là **định danh dự án, không phải khóa** — riêng cái tên
`apiKey` là do Google đặt nhầm. Khóa **site** của reCAPTCHA cũng công khai
theo đúng thiết kế: reCAPTCHA không chạy được nếu nó không nằm trong trang.

Vì thế CI truyền chúng qua *variables* chứ không phải *secrets*. Bí mật thật
sự duy nhất là khóa service account — `FIREBASE_SERVICE_ACCOUNT` trong CI, và
tệp JSON mà `npm run export:csv` dùng tại máy. Không cái nào tới trình duyệt.

### Rules có bài kiểm tra riêng

[firestore.rules.test.ts](firestore.rules.test.ts) chạy trên emulator qua
`@firebase/rules-unit-testing`, phủ 23 trường hợp: đơn hợp lệ ghi được, ID tài
liệu sai dạng, `createdAt` lấy từ đồng hồ máy khách, 0 / 60 / 61 mẫu, thiếu
trường, thừa trường, trường `uid` của bản cũ, ghi lần hai, sửa, xóa, đọc lại
đơn vừa ghi, liệt kê bộ sưu tập, và các bộ sưu tập khác.

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

**Khóa theo `maHoSo` làm cho việc ghi trở nên bất biến theo thiết kế.** Rules
chỉ cho `create`, nên một mã hồ sơ không thể có tài liệu thứ hai — không cần
quét bảng dò trùng như bản cũ. Dạng của ID nay do rules ép: hồi còn đăng nhập
thì ID coi như đáng tin vì chỉ sinh viên đã xác thực mới ghi được, còn nay thì
ai cũng tự đặt được.

Đơn nộp thời còn đăng nhập vẫn giữ trường `uid` của chúng. Không di trú:
không trình duyệt nào đọc chúng nữa, script xuất CSV bỏ qua khóa lạ, và
Firebase console vẫn xem được.

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

Không còn trang quản trị. Cách duy nhất đọc dữ liệu là
[scripts/export-csv.ts](scripts/export-csv.ts), chạy tại máy người phụ trách:

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
vòng qua **cả rules lẫn App Check** — lòng tin nằm ở đúng một tệp JSON trên
đúng một máy. Tệp đó không bao giờ được vào kho mã; `.gitignore` chặn sẵn cả
nó lẫn các file `.csv` xuất ra.

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

1. Tạo dự án mới và bật **Firestore** ở chế độ production. Không cần
   Authentication.
2. Chép cấu hình web ở **Project settings → Your apps → Web** vào `.env`
   (xem [.env.example](.env.example)) và vào *Variables* của repo.
3. Điền ID dự án vào [.firebaserc](.firebaserc), hoặc chạy
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
| `redirects` trong [firebase.json](firebase.json) | `/ir-form` → `/ir-form/` |
| Bảng định tuyến của proxy | `/ir-form` → site này |

`firebase.json` còn một dòng nữa: `/` → `/ir-form/`. Nó chỉ có tác dụng khi mở
thẳng `<project>.web.app`, để gốc của site không phải một ngõ cụt lúc dò lỗi.
Qua proxy thì `/` đã do trang chủ trả lời, không bao giờ chạm tới đây.

`base` là đường dẫn **tuyệt đối** chứ không phải `./` như bản trước. Với `./`
thì địa chỉ được phân giải theo URL đang mở, nên ai gõ thiếu dấu gạch cuối sẽ
làm `fonts/` trỏ về gốc tên miền — tức là sang trang chủ. Trang vẫn hiện, chỉ
có nút "Tải PDF" chết, đúng loại lỗi mà người xây dựng không bao giờ gặp vì họ
luôn mở đúng địa chỉ. Dòng `redirects` bịt nốt trường hợp đó ở phía máy chủ.

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
     account có quyền Firebase Hosting Admin và Firebase Rules Admin.
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
firestore.rules          Một nửa ranh giới bảo mật — đọc trước khi sửa
firestore.rules.test.ts  Bài kiểm tra cho nó (App Check thì không có bài nào)
public/fonts/            Phông Tinos đã cắt gọn + giấy phép
scripts/export-csv.ts    Xuất CSV tại máy bằng service account
scripts/submissionRows.ts  Đọc tài liệu thành dòng + dựng CSV (có bài kiểm tra)
scripts/                 Dựng phông, xem thử PDF, đếm số trang
src/lib/firebase.ts      Khởi tạo Firebase và App Check, nối emulator khi dev
src/lib/submissions.ts   Ghi đơn vào Firestore + bẫy gửi lại
src/lib/maHoSo.ts        Sinh mã hồ sơ (dạng do firestore.rules ép)
src/lib/schema.ts        Định nghĩa dữ liệu đơn — nguồn duy nhất
src/lib/pdf/             Bố cục PDF và nạp phông
src/lib/storage.ts       Bản nháp và thông tin cá nhân (localStorage)
src/lib/session.ts       Đơn vừa gửi (sessionStorage)
src/screens/             Ba màn hình của sinh viên
```

## Thay đổi thường gặp

- **Thêm giảng viên hướng dẫn** — sửa `SUPERVISORS` trong
  [src/lib/constants.ts](src/lib/constants.ts).
- **Đổi trạng thái mẫu cho phép** — sửa `SAMPLE_STATES` cùng file.
- **Đổi tên bộ môn hoặc thiết bị** — sửa `DEPARTMENT` / `EQUIPMENT` cùng file.
- **Thêm tên miền mới cho trang** — thêm vào khóa reCAPTCHA *trước* khi trỏ
  tên miền, nếu không App Check chặn sạch mọi lá đơn từ đó.
- **Đổi dạng mã hồ sơ** — sửa `MA_HO_SO_PATTERN` và `RANDOM_LENGTH` trong
  [src/lib/maHoSo.ts](src/lib/maHoSo.ts) *và* regex trong
  [firestore.rules](firestore.rules). Hai nơi là cố ý: rules không import được
  JavaScript. Bài kiểm tra trong `maHoSo.test.ts` giữ hai bản chép khớp nhau.
- **Chỉnh khoảng cách trong PDF** — các hằng số ở đầu
  [src/lib/pdf/docDefinition.ts](src/lib/pdf/docDefinition.ts), kiểm lại bằng
  `scripts/check-pagination.ts`.

Đơn hiện chỉ dùng cho FT-IR. Nếu sau này bộ môn thêm thiết bị khác thì
`docDefinition.ts` cần tách thành nhiều mẫu thay vì một hàm cố định.
