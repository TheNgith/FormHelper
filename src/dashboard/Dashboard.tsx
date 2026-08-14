import { useCallback, useEffect, useMemo, useState } from 'react';

import { isAdminEmail } from '../lib/admins';
import { db } from '../lib/firebase';
import type { validateForm } from '../lib/schema';
import SignIn from './SignIn';
import { type User, signOutAdmin, watchAdmin } from './lib/adminAuth';
import { addRecord, deleteRecords } from './lib/mutations';
import {
  LOAD_LIMIT,
  type SubmissionRecord,
  availableYears,
  loadRecords,
  toRecord,
} from './lib/records';
import Lookup from './tabs/Lookup';
import Overview from './tabs/Overview';
import Records from './tabs/Records';

/**
 * Cổng đăng nhập cộng khung ba tab.
 *
 * ## Danh sách trắng ở đây không có thẩm quyền gì
 *
 * Ai có tài khoản Google cũng đăng nhập xong được; `isAdminEmail` chỉ quyết
 * định vẽ màn hình nào. Một tài khoản lạ bỏ qua hẳn giao diện — mở console và
 * tự gọi Firestore — vẫn bị `isAdmin()` trong firestore.rules từ chối, và đó
 * là lý do duy nhất khiến cách sắp xếp này an toàn. Đừng bao giờ để một quyết
 * định *thật sự* nào phụ thuộc vào hàm đó.
 *
 * ## Một lượt đọc, rồi mọi thứ trong bộ nhớ
 *
 * Đọc cả bộ sưu tập một lần lúc nhận ra người quản trị (xem `loadRecords` để
 * biết vì sao), rồi xóa và thêm sửa thẳng mảng trong bộ nhớ. Không nạp lại,
 * nên mọi tab đều tức thì sau lần vẽ đầu.
 */

type Tab = 'overview' | 'records' | 'lookup';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  records: 'Records',
  lookup: 'Lookup',
};

const TAB_ORDER: Tab[] = ['overview', 'records', 'lookup'];

export default function Dashboard() {
  // `undefined` = Firebase còn đang dò bộ nhớ; `null` = đã dò xong, chưa đăng
  // nhập. Gộp hai trạng thái ấy làm một là chớp một màn hình đăng nhập trước
  // mặt người đang có phiên hợp lệ.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const [records, setRecords] = useState<SubmissionRecord[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [year, setYear] = useState('');

  useEffect(() => watchAdmin(setUser), []);

  const isAdmin = user !== undefined && user !== null && isAdminEmail(user.email);

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;
    setLoadError(null);

    loadRecords(db)
      .then((result) => {
        if (cancelled) return;
        setRecords(result.records);
        setTruncated(result.truncated);
        setYear((prev) => prev || availableYears(result.records)[0] || '');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const code = (cause as { code?: string }).code ?? '';
        setLoadError(
          // App Check đứng trước *toàn bộ* API Firestore, kể cả lượt đọc này,
          // và khi nó chặn thì triệu chứng cũng là permission-denied. Nói ra
          // cả hai khả năng ở đây rẻ hơn nhiều so với việc dò từ đầu.
          code === 'permission-denied'
            ? 'The server refused the read. Either this account is not in the ' +
                'rules allowlist, or App Check rejected the request. Check ' +
                'firestore.rules first, then App Check in the Firebase console.'
            : `Could not load submissions${code ? ` (${code})` : ''}.`,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const years = useMemo(() => (records ? availableYears(records) : []), [records]);

  const handleDelete = useCallback(async (maHoSoList: string[]) => {
    await deleteRecords(db, maHoSoList);
    // Sửa thẳng mảng đang giữ thay vì đọc lại. Nếu một lô hỏng giữa chừng thì
    // ngoại lệ đã ném lên trước dòng này, và tab bản ghi bảo người dùng tải
    // lại trang — không có chuyện danh sách trên màn hình nói dối.
    const removed = new Set(maHoSoList);
    setRecords((prev) => prev?.filter((record) => !removed.has(record.maHoSo)) ?? prev);
  }, []);

  const handleAdd = useCallback(
    async (result: ReturnType<typeof validateForm>, maHoSo: string) => {
      if (!result.ok) return;
      await addRecord(db, result.values, maHoSo);

      // Dựng lại bản ghi trong bộ nhớ từ chính giá trị vừa ghi. `createdAt`
      // thật do máy chủ đặt và ta không đọc lại, nên dùng giờ máy — lệch vài
      // trăm mili giây, và chỉ ảnh hưởng đúng thứ tự sắp xếp cho tới lần tải
      // trang sau.
      const values = result.values;
      const fresh = toRecord(maHoSo, {
        ...values,
        maHoSo,
        requestDate: values.date,
        createdAt: new Date(),
      });
      setRecords((prev) => (prev ? [fresh, ...prev] : [fresh]));
    },
    [],
  );

  if (user === undefined) {
    return <Shell>{null}</Shell>;
  }

  if (user === null) {
    return (
      <Shell>
        <SignIn />
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell email={user.email}>
        <div className="notice notice-danger" role="alert">
          <span>
            <strong>Not authorised</strong>
            {user.email} is not on the allowlist for this dashboard.
          </span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void signOutAdmin()}>
          Sign out
        </button>
      </Shell>
    );
  }

  return (
    <Shell email={user.email} onSignOut={() => void signOutAdmin()}>
      <nav className="tabs" aria-label="Dashboard sections">
        {TAB_ORDER.map((name) => (
          <button
            key={name}
            type="button"
            className="tab"
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setTab(name)}
          >
            {TAB_LABELS[name]}
          </button>
        ))}
      </nav>

      {loadError && (
        <div className="notice notice-danger" role="alert">
          <span>{loadError}</span>
        </div>
      )}

      {truncated && (
        // Cái trần 5000 là chốt để lập luận "đọc hết một lượt" không lặng lẽ
        // hết hạn. Chạm nó thì phải nói ra, chứ không vẽ một bức tranh thiếu
        // như thể nó đủ.
        <div className="notice notice-accent" role="status">
          <span>
            <strong>Showing the oldest {LOAD_LIMIT} submissions only</strong>
            The collection has outgrown a single read, and the records cut off
            are the most recent ones. Every number and chart on this page is
            computed from this subset. Use `npm run export:csv` for the full
            picture until server-side paging is added.
          </span>
        </div>
      )}

      {records === null ? (
        !loadError && <p className="table-empty">Loading submissions…</p>
      ) : (
        <>
          {tab === 'overview' && (
            <Overview records={records} years={years} year={year} onYearChange={setYear} />
          )}
          {tab === 'records' && (
            <Records records={records} onDelete={handleDelete} onAdd={handleAdd} />
          )}
          {tab === 'lookup' && <Lookup records={records} />}
        </>
      )}
    </Shell>
  );
}

function Shell({
  email,
  onSignOut,
  children,
}: {
  email?: string | null;
  onSignOut?: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="page dashboard">
      <div className="sheet">
        <header className="sheet-head">
          <h1>Dashboard</h1>
          {email && <p className="sheet-meta">{email}</p>}
          {onSignOut && (
            <button type="button" className="btn btn-ghost" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </main>
  );
}
