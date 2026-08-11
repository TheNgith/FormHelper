# Đơn xin sử dụng thiết bị

Trang tĩnh giúp sinh viên điền và in đơn xin mượn **máy quang phổ hồng ngoại
(FT-IR)** của Bộ môn Hóa Hữu Cơ, đồng thời ghi lại mỗi lần nộp vào một Google
Sheet.

Sinh viên điền biểu mẫu, xem lại bản tóm tắt, xác nhận gửi, rồi tải về file PDF
khổ A4 đúng bố cục mẫu giấy để in và ký.

## Chạy tại máy

```bash
npm install
cp .env.example .env   # điền endpoint và token
npm run dev
```

## Build

```bash
npm run build     # kết quả trong dist/
npm run preview
```

## Phông chữ

`public/fonts/` chứa bốn kiểu Tinos đã được cắt gọn (subset) còn Latin +
tiếng Việt. Tinos tương thích metric với Times New Roman và phát hành theo
giấy phép SIL Open Font License 1.1 (`public/fonts/OFL.txt`).

Dựng lại phông:

```bash
./scripts/build-fonts.sh   # cần pyftsubset: pip install fonttools brotli
```

Phần còn lại của tài liệu (thiết lập Apps Script, hosting, bảo mật) được bổ
sung ở các bước sau.
