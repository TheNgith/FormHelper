/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Địa chỉ /exec của Apps Script Web App nhận đơn. */
  readonly VITE_SHEETS_ENDPOINT?: string;
  /** Chuỗi dùng chung, phải trùng với TOKEN trong apps-script/Code.gs. */
  readonly VITE_SHEETS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
