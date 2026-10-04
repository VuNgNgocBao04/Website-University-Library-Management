import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
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
} from '../ui';
import type { Account, Detail, Page, Payment, Receipt, Violation } from '../types';
export function Loans({
  current = false,
  overdue = false,
}: {
  current?: boolean;
  overdue?: boolean;
}) {
  const { user } = useAuth();
  const librarian = user!.role === 'LIBRARIAN';
  const [page, setPage] = useState(0);
  const [readerId, setReaderId] = useState('');
  const [status, setStatus] = useState('');
  const [create, setCreate] = useState(false);
  const [returnDetail, setReturn] = useState<Detail | null>(null);
  const [lost, setLost] = useState<Detail | null>(null);
  const endpoint = current
    ? '/loans/mine/current'
    : overdue
      ? '/loans/overdue'
      : `/loans?page=${page}&size=10&${readerId ? 'readerId=' + readerId + '&' : ''}${status ? 'status=' + status : ''}`;
  const q = useQuery<Page<Receipt> | Receipt[] | Detail[]>(endpoint);
  const receipts = current
    ? []
    : overdue
      ? (q.data as Receipt[]) || []
      : (q.data as Page<Receipt>)?.content || [];
  const details = current ? (q.data as Detail[]) || [] : [];
  const done = () => {
    setReturn(null);
    setLost(null);
    q.reload();
  };
  const renderDetail = (d: Detail) => (
    <div className="loan-detail" key={d.id}>
      <div>
        <Link className="fw-semibold" to={'/books/' + d.bookId}>
          {d.title}
        </Link>
        <small className="d-block text-secondary">
          {d.barcode} · Chi tiết #{d.id}
        </small>
      </div>
      <div>
        <small className="text-secondary">Hạn trả</small>
        <div className={!d.closedAt && new Date(d.dueDate) < new Date() ? 'text-danger' : ''}>
          {date(d.dueDate)}
        </div>
      </div>
      <div>
        <small className="text-secondary">
          {d.closedAt ? 'Phí trễ hạn đã chốt' : 'Phí trễ hạn tạm tính'}
        </small>
        <div>{money(d.estimatedFine)}</div>
      </div>
      <div>
        {d.closedAt ? (
          <>
            <Badge value={d.returnedAt ? 'RETURNED' : 'LOST'} />
            <small className="d-block text-secondary">{date(d.closedAt)}</small>
          </>
        ) : d.itemStatus === 'LOST' ? (
          <div>
            <Badge value="LOST" />
            <small className="d-block text-secondary">Chưa đóng nghĩa vụ mượn</small>
            {librarian && <Link to="/violations">Xử lý trong mục Vi phạm</Link>}
          </div>
        ) : librarian ? (
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={() => setReturn(d)}>
              Nhận trả
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setLost(d)}>
              Báo mất
            </button>
          </div>
        ) : (
          <Badge value="ON_LOAN" />
        )}
      </div>
    </div>
  );
  return (
    <>
      <PageTitle
        title={
          current
            ? 'Sách đang mượn'
            : overdue
              ? 'Theo dõi quá hạn'
              : user!.role === 'READER'
                ? 'Lịch sử mượn sách'
                : 'Mượn & trả sách'
        }
        description="Mỗi cuốn có hạn trả riêng. Đóng phiếu không đồng nghĩa đã thanh toán hết phí."
        action={
          librarian && (
            <button className="btn btn-primary" onClick={() => setCreate(true)}>
              ＋ Lập phiếu mượn
            </button>
          )
        }
      />
      {!current && !overdue && (
        <section className="panel mb-4">
          <div className="row g-3">
            {user!.role !== 'READER' && (
              <div className="col-md-6">
                <label className="form-label" htmlFor="reader-filter">
                  Lọc theo ID bạn đọc
                </label>
                <input
                  id="reader-filter"
                  type="number"
                  className="form-control"
                  value={readerId}
                  onChange={(e) => {
                    setReaderId(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            )}
            <div className="col-md-6">
              <label className="form-label" htmlFor="loan-status">
                Trạng thái phiếu
              </label>
              <select
                id="loan-status"
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                {options(['BORROWING', 'PARTIALLY_RETURNED', 'RETURNED']).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}
      <QueryState {...q}>
        {current ? (
          <section className="panel">
            {details.length ? (
              details.map(renderDetail)
            ) : (
              <Empty>Bạn không có cuốn sách nào đang mượn.</Empty>
            )}
          </section>
        ) : receipts.length ? (
          receipts.map((r) => (
            <section className="panel mb-4" key={r.id}>
              <div className="d-flex justify-content-between flex-wrap gap-3 border-bottom pb-3 mb-2">
                <div>
                  <h2 className="h5 mb-1">
                    Phiếu #{r.id} · {r.readerName}
                  </h2>
                  <small className="text-secondary">
                    {date(r.borrowDate)} · Thủ thư: {r.librarianName}
                  </small>
                </div>
                <Badge value={r.status} />
              </div>
              {r.note && <p className="text-secondary small mt-3">{r.note}</p>}
              {r.details.map(renderDetail)}
            </section>
          ))
        ) : (
          <Empty>Chưa có phiếu mượn phù hợp.</Empty>
        )}
        {!current && !overdue && <Pagination data={q.data as Page<Receipt>} onPage={setPage} />}
      </QueryState>
      {create && (
        <Modal title="Lập phiếu giao sách" onClose={() => setCreate(false)}>
          <CreateLoan
            onDone={() => {
              setCreate(false);
              q.reload();
            }}
          />
        </Modal>
      )}
      {returnDetail && (
        <Modal title={'Nhận trả · ' + returnDetail.barcode} onClose={() => setReturn(null)}>
          <Form
            fields={[
              {
                name: 'condition',
                label: 'Tình trạng khi trả',
                options: options(['GOOD', 'DAMAGED']),
              },
              {
                name: 'damageFine',
                label: 'Phí hỏng (VND)',
                type: 'number',
                min: 0,
                step: '0.01',
                required: false,
                hint: 'Bắt buộc nhập phí và lý do nếu sách hỏng.',
              },
              { name: 'reason', label: 'Lý do / ghi chú hỏng', type: 'textarea', required: false },
            ]}
            initial={{ condition: 'GOOD' }}
            submit="Xác nhận nhận trả"
            onSubmit={async (v) => {
              if (!window.confirm('Xác nhận đã nhận cuốn sách thực tế?')) return;
              await api('/loan-details/' + returnDetail.id + '/return', 'POST', {
                ...v,
                damageFine: v.damageFine ? Number(v.damageFine) : null,
              });
              done();
            }}
          />
        </Modal>
      )}
      {lost && (
        <Modal title={'Ghi nhận mất · ' + lost.barcode} onClose={() => setLost(null)}>
          <p className="text-secondary">
            Thao tác này ghi vi phạm và đánh dấu cuốn LOST. Đóng nghĩa vụ mượn là thao tác riêng
            trong mục Vi phạm.
          </p>
          <Form
            fields={[
              {
                name: 'fineAmount',
                label: 'Phí mất sách (VND)',
                type: 'number',
                min: 0,
                step: '0.01',
              },
              { name: 'notes', label: 'Lý do xác định phí', type: 'textarea' },
            ]}
            submit="Ghi nhận mất sách"
            onSubmit={async (v) => {
              await api('/violations', 'POST', {
                borrowDetailId: lost.id,
                type: 'LOST',
                fineAmount: Number(v.fineAmount),
                notes: v.notes,
              });
              done();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function CreateLoan({ onDone }: { onDone: () => void }) {
  const [search, setSearch] = useState('');
  const q = useQuery<Page<Account>>('/users/readers?size=100&q=' + encodeURIComponent(search));
  const [reader, setReader] = useState('');
  const [eligibility, setEligibility] = useState<{
    currentBooks: number;
    maxBooksAllowed: number;
    maxDaysAllowed: number;
  } | null>(null);
  return (
    <>
      <label className="form-label" htmlFor="reader-search">
        Tra cứu bạn đọc
      </label>
      <input
        id="reader-search"
        className="form-control mb-3"
        placeholder="Tên hoặc tài khoản…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <QueryState {...q}>
        <label className="form-label" htmlFor="choose-reader">
          Chọn bạn đọc
        </label>
        <select
          id="choose-reader"
          className="form-select mb-3"
          value={reader}
          onChange={(e) => {
            setReader(e.target.value);
            setEligibility(null);
          }}
        >
          <option value="">Chọn bạn đọc…</option>
          {q.data?.content.map((u) => (
            <option key={u.id} value={u.id}>
              {u.readerCode} · {u.fullName} · {u.status}
            </option>
          ))}
        </select>
      </QueryState>
      <Action
        onClick={async () => {
          if (!reader) throw new Error('Chọn bạn đọc trước.');
          setEligibility(await api('/loans/eligibility/' + reader));
        }}
      >
        Kiểm tra hạn mức
      </Action>
      {eligibility && (
        <div className="alert alert-info mt-3">
          Đang mượn {eligibility.currentBooks}/{eligibility.maxBooksAllowed} cuốn · Hạn mượn{' '}
          {eligibility.maxDaysAllowed} ngày
        </div>
      )}
      <div className="mt-4">
        <Form
          fields={[
            { name: 'barcodes', label: 'Mã vạch (mỗi dòng một mã)', type: 'textarea' },
            { name: 'note', label: 'Ghi chú', required: false },
          ]}
          submit="Xác nhận giao sách"
          onSubmit={async (v) => {
            if (!reader) throw new Error('Vui lòng chọn bạn đọc.');
            await api('/loans', 'POST', {
              readerId: Number(reader),
              barcodes: v.barcodes
                .split(/\n/)
                .map((s) => s.trim())
                .filter(Boolean),
              note: v.note || '',
            });
            onDone();
          }}
        />
      </div>
    </>
  );
}
export function Violations() {
  const { user } = useAuth();
  const librarian = user!.role === 'LIBRARIAN';
  const [page, setPage] = useState(0);
  const [reader, setReader] = useState('');
  const q = useQuery<Page<Violation>>(
    `/violations?page=${page}&size=20${reader ? '&readerId=' + reader : ''}`,
  );
  const [pay, setPay] = useState<Violation | null>(null);
  const [key, setKey] = useState('');
  const [lost, setLost] = useState<Violation | null>(null);
  const [history, setHistory] = useState<Violation | null>(null);
  return (
    <>
      <PageTitle
        title="Vi phạm & phí"
        description="Trạng thái xử lý vi phạm độc lập với số tiền đã thanh toán."
      />
      {user!.role === 'READER' ? (
        <Debt readerId={user!.id} />
      ) : (
        <section className="panel mb-4">
          <label className="form-label" htmlFor="debt-reader">
            Lọc theo ID bạn đọc
          </label>
          <input
            id="debt-reader"
            type="number"
            className="form-control"
            value={reader}
            onChange={(e) => {
              setReader(e.target.value);
              setPage(0);
            }}
          />
          {reader && (
            <Debt
              key={q.data?.content.map((v) => v.paidAmount).join(',')}
              readerId={Number(reader)}
            />
          )}
        </section>
      )}
      <section className="panel">
        <QueryState {...q}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Vi phạm</th>
                  <th>Bạn đọc / Sách</th>
                  <th>Phí / Đã thu</th>
                  <th>Còn nợ</th>
                  <th>Xử lý</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.content.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Badge value={v.type} />
                      <small className="d-block mt-2">
                        #{v.id} · {date(v.createdAt)}
                      </small>
                    </td>
                    <td>
                      <strong>{v.readerName}</strong>
                      <div>{v.title}</div>
                      <small className="text-secondary">{v.notes}</small>
                    </td>
                    <td>
                      {money(v.fineAmount)}
                      <small className="d-block text-secondary">Đã thu {money(v.paidAmount)}</small>
                    </td>
                    <td className="fw-semibold">{money(v.outstandingAmount)}</td>
                    <td>
                      <Badge value={v.status} />
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-sm btn-light" onClick={() => setHistory(v)}>
                          Lịch sử thu
                        </button>
                        {librarian && (
                          <>
                            {v.outstandingAmount > 0 && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  setPay(v);
                                  setKey(crypto.randomUUID());
                                }}
                              >
                                Thu phí
                              </button>
                            )}
                            {v.type === 'LOST' && !v.loanClosedAt && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setLost(v)}
                              >
                                Đóng nghĩa vụ mất
                              </button>
                            )}
                            {v.type === 'LOST' && v.loanClosedAt && (
                              <span className="text-secondary">Đã đóng nghĩa vụ mượn</span>
                            )}
                            {v.status === 'OPEN' && (
                              <Action
                                confirm="Đánh dấu vi phạm đã xử lý? Số nợ vẫn được giữ nếu chưa thu đủ."
                                onClick={async () => {
                                  await api('/violations/' + v.id + '/resolve', 'POST');
                                  q.reload();
                                }}
                              >
                                Đã xử lý
                              </Action>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!q.data?.content.length && <Empty>Chưa có vi phạm.</Empty>}
          <Pagination data={q.data} onPage={setPage} />
        </QueryState>
      </section>
      {pay && (
        <Modal title={'Thu phí vi phạm #' + pay.id} onClose={() => setPay(null)}>
          <p>
            Còn nợ: <strong>{money(pay.outstandingAmount)}</strong>
          </p>
          <Form
            fields={[
              {
                name: 'amount',
                label: 'Số tiền thực thu (VND)',
                type: 'number',
                min: 0.01,
                step: '0.01',
              },
            ]}
            initial={{ amount: String(pay.outstandingAmount) }}
            submit="Ghi nhận đã thu tiền"
            onSubmit={async (v) => {
              if (!window.confirm('Xác nhận đã nhận số tiền này?')) return;
              await api('/violations/' + pay.id + '/payments', 'POST', {
                amount: Number(v.amount),
                idempotencyKey: key,
              });
              setPay(null);
              q.reload();
            }}
          />
        </Modal>
      )}
      {lost && (
        <Modal title="Đóng nghĩa vụ mượn cuốn đã mất" onClose={() => setLost(null)}>
          <p>Cuốn tiếp tục ở trạng thái LOST. Phí trễ hạn được chốt tại thời điểm đóng.</p>
          <Form
            fields={[{ name: 'reason', label: 'Căn cứ / lý do đóng nghĩa vụ', type: 'textarea' }]}
            submit="Xác nhận đóng nghĩa vụ"
            onSubmit={async (v) => {
              await api('/violations/' + lost.id + '/close-lost-loan', 'POST', v);
              setLost(null);
              q.reload();
            }}
          />
        </Modal>
      )}
      {history && (
        <Modal title={'Lịch sử thu phí #' + history.id} onClose={() => setHistory(null)}>
          <PaymentHistory id={history.id} />
        </Modal>
      )}
    </>
  );
}
function Debt({ readerId }: { readerId: number }) {
  const q = useQuery<{ outstandingAmount: number }>('/violations/debt/' + readerId);
  return (
    <div className="debt-card mb-4">
      <span>Tổng phí còn nợ</span>
      <QueryState {...q}>
        <strong>{money(q.data?.outstandingAmount || 0)}</strong>
        <small>Không bao gồm phí trễ hạn tạm tính của cuốn chưa đóng.</small>
      </QueryState>
    </div>
  );
}
function PaymentHistory({ id }: { id: number }) {
  const q = useQuery<Payment[]>('/violations/' + id + '/payments');
  return (
    <QueryState {...q}>
      {q.data?.length ? (
        q.data.map((p) => (
          <div className="list-row" key={p.id}>
            <div>
              {date(p.paidAt)}
              <small className="d-block">Thủ thư: {p.collectedBy}</small>
            </div>
            <strong>{money(p.amount)}</strong>
          </div>
        ))
      ) : (
        <Empty>Chưa ghi nhận lần thu nào.</Empty>
      )}
    </QueryState>
  );
}
