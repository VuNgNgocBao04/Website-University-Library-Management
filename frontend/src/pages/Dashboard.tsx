import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Badge, date, PageTitle, QueryState, Empty } from '../ui';
import type { Page, Book, Account, Receipt } from '../types';
import { DataTable } from '../components/DataTable';
import { StatCard } from '../components/StatCard';
type Snapshot = {
  books: number;
  readers: number;
  states: number[];
  overdue: Receipt[];
  loans: Receipt[];
};
export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState<unknown>();
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    Promise.all([
      api<Page<Book>>('/books?size=1'),
      api<Page<Account>>(
        user!.role === 'ADMIN' ? '/users?role=READER&size=1' : '/users/readers?size=1',
      ),
      api<Page<Receipt>>('/loans?status=BORROWING&size=1'),
      api<Page<Receipt>>('/loans?status=PARTIALLY_RETURNED&size=1'),
      api<Page<Receipt>>('/loans?status=RETURNED&size=1'),
      api<Receipt[]>('/loans/overdue'),
      api<Page<Receipt>>('/loans?size=5'),
    ])
      .then(([books, readers, active, partial, returned, overdue, loans]) => {
        if (live)
          setData({
            books: books.totalElements,
            readers: readers.totalElements,
            states: [active.totalElements, partial.totalElements, returned.totalElements],
            overdue,
            loans: loans.content,
          });
      })
      .catch((e) => {
        if (live) setError(e);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [user?.role, version]);
  return (
    <>
      <PageTitle
        title="Tổng quan thư viện"
        description="Theo dõi tài liệu, bạn đọc và hoạt động mượn trả."
        action={
          <button className="btn btn-outline-primary" onClick={() => setVersion((v) => v + 1)}>
            ↻ Làm mới
          </button>
        }
      />
      <QueryState loading={loading} error={error}>
        {data && (
          <>
            <div className="metrics">
              <StatCard
                title="Đầu sách"
                value={data.books}
                hint="Trong danh mục hiện tại"
                to="/"
                icon="▥"
              />
              <StatCard
                title="Phiếu chưa trả hết"
                value={data.states[0] + data.states[1]}
                hint="Gồm phiếu trả một phần"
                to="/loans"
                icon="⇄"
              />
              <StatCard
                title="Cuốn quá hạn"
                value={data.overdue.reduce(
                  (n, r) =>
                    n +
                    r.details.filter(
                      (d) => !d.closedAt && new Date(d.dueDate).getTime() < Date.now(),
                    ).length,
                  0,
                )}
                hint="Cần theo dõi hạn trả"
                to="/overdue"
                icon="◷"
              />
              <StatCard
                title="Bạn đọc"
                value={data.readers}
                hint="Sinh viên và giảng viên"
                to={user!.role === 'ADMIN' ? '/accounts' : '/loans'}
                icon="♙"
              />
            </div>
            <div className="row g-4 my-1">
              <div className="col-lg-7">
                <section className="panel h-100">
                  <h2 className="section-title h5">Tình hình phiếu mượn</h2>
                  <p className="text-secondary">
                    Số phiếu theo trạng thái, không phải số lượt cuốn.
                  </p>
                  {data.states.some(Boolean) ? (
                    ['Đang mượn', 'Đã trả một phần', 'Đã đóng phiếu'].map((name, i) => (
                      <div className="chart-row" key={name}>
                        <div className="d-flex justify-content-between">
                          <span>{name}</span>
                          <strong>{data.states[i]}</strong>
                        </div>
                        <div className="bar-track" aria-hidden="true">
                          <div
                            style={{
                              width: (100 * data.states[i]) / Math.max(...data.states, 1) + '%',
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty />
                  )}
                </section>
              </div>
              <div className="col-lg-5">
                <section className="panel h-100">
                  <h2 className="section-title h5">Công việc tại quầy</h2>
                  <p className="text-secondary">Truy cập nhanh đúng vai trò của bạn.</p>
                  <div className="d-grid gap-3">
                    {user!.role === 'LIBRARIAN' ? (
                      <>
                        <Link className="btn btn-accent" to="/loans">
                          Lập phiếu & nhận trả
                        </Link>
                        <Link className="btn btn-outline-primary" to="/violations">
                          Vi phạm & thu phí
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link className="btn btn-primary" to="/reports">
                          Xem báo cáo
                        </Link>
                        <Link className="btn btn-outline-primary" to="/rules">
                          Cấu hình quy định mượn
                        </Link>
                      </>
                    )}
                    <Link className="btn btn-light" to="/">
                      Quản lý danh mục sách
                    </Link>
                  </div>
                </section>
              </div>
            </div>
            <section className="panel mt-4">
              <div className="d-flex justify-content-between gap-3 mb-3">
                <h2 className="section-title h5">Danh sách phiếu mượn</h2>
                <Link to="/loans">Xem tất cả →</Link>
              </div>
              <DataTable
                caption="Phiếu mượn từ dữ liệu thư viện"
                rows={data.loans}
                rowKey={(r) => r.id}
                columns={[
                  { title: 'Mã phiếu', render: (r) => '#' + r.id },
                  { title: 'Bạn đọc', render: (r) => r.readerName },
                  { title: 'Ngày mượn', render: (r) => date(r.borrowDate) },
                  { title: 'Số cuốn', render: (r) => r.details.length },
                  { title: 'Trạng thái', render: (r) => <Badge value={r.status} /> },
                ]}
              />
            </section>
          </>
        )}
      </QueryState>
    </>
  );
}
