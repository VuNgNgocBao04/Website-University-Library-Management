import { useState } from 'react';
import { api, download } from '../api';
import {
  Action,
  Badge,
  Empty,
  Form,
  Modal,
  PageTitle,
  Pagination,
  QueryState,
  useQuery,
  date,
  money,
  options,
  type Field,
} from '../ui';
import type { Account, Page, Rule, Report, Notice } from '../types';
const profileFields: Field[] = [
  { name: 'fullName', label: 'Họ tên' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phoneNumber', label: 'Số điện thoại', required: false },
];
const roleFields: Field[] = [
  { name: 'role', label: 'Vai trò', options: options(['ADMIN', 'LIBRARIAN', 'READER']) },
  {
    name: 'employeeId',
    label: 'Mã nhân viên',
    required: false,
    hint: 'Bắt buộc với quản trị viên và thủ thư.',
  },
  { name: 'readerCode', label: 'Mã bạn đọc', required: false, hint: 'Bắt buộc với bạn đọc.' },
  {
    name: 'readerType',
    label: 'Loại bạn đọc',
    required: false,
    options: options(['STUDENT', 'LECTURER']),
  },
];
export function Accounts() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const q = useQuery<Page<Account>>(
    `/users?page=${page}&size=20&q=${encodeURIComponent(search)}${role ? '&role=' + role : ''}`,
  );
  const [create, setCreate] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);
  const [changeRole, setChangeRole] = useState<Account | null>(null);
  return (
    <>
      <PageTitle
        title="Quản lý tài khoản"
        description="Cấp tài khoản và phân quyền truy cập thư viện."
        action={
          <button className="btn btn-primary" onClick={() => setCreate(true)}>
            ＋ Tạo tài khoản
          </button>
        }
      />
      <section className="panel">
        <div className="row g-3 mb-4">
          <div className="col-md-8">
            <label className="form-label" htmlFor="user-search">
              Tìm tên hoặc tài khoản
            </label>
            <input
              id="user-search"
              className="form-control"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="role-filter">
              Vai trò
            </label>
            <select
              id="role-filter"
              className="form-select"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả</option>
              {options(['ADMIN', 'LIBRARIAN', 'READER']).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <QueryState {...q}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Hồ sơ</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.content.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.fullName}</strong>
                      <small className="d-block">
                        #{u.id} · {u.username}
                      </small>
                    </td>
                    <td>
                      {u.readerCode || u.employeeId}
                      <small className="d-block text-secondary">{u.email}</small>
                      {u.readerType && <Badge value={u.readerType} />}
                    </td>
                    <td>
                      <Badge value={u.role} />
                    </td>
                    <td>
                      <Badge value={u.status} />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-light" onClick={() => setEdit(u)}>
                          Sửa
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => setChangeRole(u)}>
                          Đổi quyền
                        </button>
                        <Action
                          confirm={`Xác nhận ${u.status === 'ACTIVE' ? 'khóa' : 'mở'} tài khoản ${u.username}?`}
                          onClick={async () => {
                            await api('/users/' + u.id + '/status', 'PATCH', {
                              status: u.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
                            });
                            q.reload();
                          }}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                        </Action>
                        <Action
                          confirm="Ngừng hoạt động tài khoản này?"
                          onClick={async () => {
                            await api('/users/' + u.id + '/status', 'PATCH', {
                              status: 'INACTIVE',
                            });
                            q.reload();
                          }}
                        >
                          Ngừng hoạt động
                        </Action>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!q.data?.content.length && <Empty />}
          <Pagination data={q.data} onPage={setPage} />
        </QueryState>
      </section>
      {create && (
        <Modal title="Tạo tài khoản" onClose={() => setCreate(false)}>
          <Form
            fields={[
              { name: 'username', label: 'Tên đăng nhập' },
              {
                name: 'password',
                label: 'Mật khẩu ban đầu',
                type: 'password',
                hint: 'Từ 10 đến 72 ký tự.',
              },
              ...profileFields,
              ...roleFields,
            ]}
            onSubmit={async (v) => {
              await api('/users', 'POST', { ...v, readerType: v.readerType || null });
              setCreate(false);
              q.reload();
            }}
          />
        </Modal>
      )}
      {edit && (
        <Modal title="Cập nhật hồ sơ tài khoản" onClose={() => setEdit(null)}>
          <Form
            fields={profileFields}
            initial={{
              fullName: edit.fullName,
              email: edit.email,
              phoneNumber: edit.phoneNumber || '',
            }}
            onSubmit={async (v) => {
              await api('/users/' + edit.id, 'PUT', v);
              setEdit(null);
              q.reload();
            }}
          />
        </Modal>
      )}
      {changeRole && (
        <Modal title={'Đổi quyền · ' + changeRole.username} onClose={() => setChangeRole(null)}>
          <p className="text-secondary">
            Giữ nguyên ID và lịch sử. Các phiên đăng nhập cũ sẽ hết hiệu lực. Bạn đọc còn nghĩa vụ
            mượn phải xử lý trước.
          </p>
          <Form
            fields={roleFields}
            initial={{
              role: changeRole.role,
              employeeId: changeRole.employeeId || '',
              readerCode: changeRole.readerCode || '',
              readerType: changeRole.readerType || '',
            }}
            onSubmit={async (v) => {
              await api('/users/' + changeRole.id + '/role', 'PATCH', {
                ...v,
                readerType: v.readerType || null,
              });
              setChangeRole(null);
              q.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Rules() {
  const q = useQuery<Rule[]>('/rules');
  const [edit, setEdit] = useState<Rule | null>(null);
  return (
    <>
      <PageTitle
        title="Quy định mượn sách"
        description="Quy định mới chỉ áp dụng cho những lần giao sách tiếp theo."
      />
      <QueryState {...q}>
        <div className="row g-4">
          {q.data?.map((r) => (
            <div className="col-md-6" key={r.id}>
              <section className="panel rule-card">
                <Badge value={r.readerType} />
                <div className="rule-number">
                  {r.maxBooksAllowed}
                  <span>cuốn tối đa</span>
                </div>
                <p>
                  Thời hạn mượn: <strong>{r.maxDaysAllowed} ngày</strong>
                </p>
                <p>
                  Phí quá hạn: <strong>{money(r.dailyFineAmount)}/ngày</strong>
                </p>
                <button className="btn btn-outline-primary" onClick={() => setEdit(r)}>
                  Chỉnh sửa quy định
                </button>
              </section>
            </div>
          ))}
        </div>
      </QueryState>
      {edit && (
        <Modal title="Cập nhật quy định mượn" onClose={() => setEdit(null)}>
          <Form
            fields={[
              { name: 'maxBooksAllowed', label: 'Số cuốn tối đa', type: 'number', min: 1 },
              { name: 'maxDaysAllowed', label: 'Số ngày mượn', type: 'number', min: 1 },
              {
                name: 'dailyFineAmount',
                label: 'Phí trễ hạn / ngày (VND)',
                type: 'number',
                min: 0,
                step: '0.01',
              },
            ]}
            initial={{
              maxBooksAllowed: String(edit.maxBooksAllowed),
              maxDaysAllowed: String(edit.maxDaysAllowed),
              dailyFineAmount: String(edit.dailyFineAmount),
            }}
            onSubmit={async (v) => {
              await api(
                '/rules/' + edit.readerType,
                'PUT',
                Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])),
              );
              setEdit(null);
              q.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function Notifications() {
  const [page, setPage] = useState(0);
  const q = useQuery<Page<Notice>>('/notifications?page=' + page);
  const count = useQuery<{ count: number }>('/notifications/unread-count');
  const reload = () => {
    q.reload();
    count.reload();
  };
  return (
    <>
      <PageTitle
        title="Thông báo"
        description={`${count.data?.count ?? '…'} thông báo chưa đọc`}
        action={
          <Action
            onClick={async () => {
              await api('/notifications/read-all', 'POST');
              reload();
            }}
          >
            Đánh dấu tất cả đã đọc
          </Action>
        }
      />
      <section className="panel">
        <QueryState {...q}>
          {q.data?.content.length ? (
            q.data.content.map((n) => (
              <article className={'notice ' + (!n.readAt ? 'unread' : '')} key={n.id}>
                <div className="notice-icon">{n.type === 'OVERDUE' ? '!' : '◷'}</div>
                <div className="flex-grow-1">
                  <h2 className="h6">{n.title}</h2>
                  <p className="mb-2 text-secondary">{n.content}</p>
                  <small>{date(n.createdAt)}</small>
                </div>
                {!n.readAt && (
                  <Action
                    onClick={async () => {
                      await api('/notifications/' + n.id + '/read', 'POST');
                      reload();
                    }}
                  >
                    Đã đọc
                  </Action>
                )}
              </article>
            ))
          ) : (
            <Empty>Bạn chưa có thông báo.</Empty>
          )}
          <Pagination data={q.data} onPage={setPage} />
        </QueryState>
      </section>
    </>
  );
}
export function Reports() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [from, setFrom] = useState(today.slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [range, setRange] = useState({ from, to });
  const params = new URLSearchParams(range);
  const q = useQuery<Report>('/reports?' + params);
  return (
    <>
      <PageTitle
        title="Báo cáo thư viện"
        description="Thống kê giao dịch, sách phổ biến và tình hình thu phí."
        action={
          <div className="d-flex gap-2">
            {['csv', 'pdf'].map((format) => (
              <Action
                key={format}
                onClick={() =>
                  download('/reports/export/' + format + '?' + params, 'bao-cao-thu-vien.' + format)
                }
              >
                Xuất {format.toUpperCase()}
              </Action>
            ))}
          </div>
        }
      />
      <section className="panel mb-4">
        <form
          className="row g-3 align-items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setRange({ from, to });
            q.reload();
          }}
        >
          <div className="col-md-4">
            <label htmlFor="from" className="form-label">
              Từ ngày
            </label>
            <input
              id="from"
              required
              type="date"
              className="form-control"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="to" className="form-label">
              Đến hết ngày
            </label>
            <input
              id="to"
              required
              type="date"
              min={from}
              className="form-control"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <button className="btn btn-primary">Xem báo cáo</button>
          </div>
        </form>
      </section>
      <QueryState {...q}>
        {q.data && (
          <>
            <div className="metrics">
              {[
                ['Phiếu mượn', q.data.borrowing.receipts],
                ['Lượt cuốn', q.data.borrowing.bookLoans],
                ['Phí phát sinh trong kỳ', money(q.data.fines.assessedInPeriod)],
                ['Tiền thu trong kỳ', money(q.data.fines.collectedInPeriod)],
              ].map(([l, v]) => (
                <section className="panel metric" key={l}>
                  <small>{l}</small>
                  <strong>{v}</strong>
                </section>
              ))}
            </div>
            <div className="debt-card my-4">
              <span>Tổng nợ tại thời điểm tạo báo cáo</span>
              <strong>{money(q.data.fines.totalOutstanding)}</strong>
              <small>Toàn bộ phí đã chốt chưa thu · {date(q.data.generatedAt)}</small>
            </div>
            <div className="row g-4">
              <div className="col-lg-5">
                <section className="panel">
                  <h2 className="h5 mb-4">Sách được mượn nhiều</h2>
                  {q.data.popularBooks.length ? (
                    q.data.popularBooks.map((b, i) => (
                      <div className="popular-row" key={b.bookId}>
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{b.title}</strong>
                          <div className="bar-track">
                            <div
                              style={{
                                width:
                                  (b.loans / (q.data!.popularBooks[0]?.loans || 1)) * 100 + '%',
                              }}
                            />
                          </div>
                        </div>
                        <b>{b.loans}</b>
                      </div>
                    ))
                  ) : (
                    <Empty>Chưa có lượt mượn trong kỳ.</Empty>
                  )}
                </section>
              </div>
              <div className="col-lg-7">
                <section className="panel">
                  <h2 className="h5 mb-4">Cuốn quá hạn hiện tại</h2>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Bạn đọc</th>
                          <th>Sách / Mã vạch</th>
                          <th>Hạn trả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.data.overdue.map((d) => (
                          <tr key={d.detailId}>
                            <td>{d.readerName}</td>
                            <td>
                              {d.title}
                              <small className="d-block text-secondary">{d.barcode}</small>
                            </td>
                            <td className="text-danger">{date(d.dueDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!q.data.overdue.length && <Empty>Không có cuốn quá hạn.</Empty>}
                </section>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
