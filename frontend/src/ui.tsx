import { useEffect, useState, useId, type ReactNode, type FormEvent } from 'react';
import { Modal as BootstrapModal } from 'react-bootstrap';
import { api, ApiError } from './api';
import type { Page } from './types';
export const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
export const date = (v?: string) =>
  v
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(v))
    : '—';
const labels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  LIBRARIAN: 'Thủ thư',
  READER: 'Bạn đọc',
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  INACTIVE: 'Ngừng hoạt động',
  AVAILABLE: 'Sẵn sàng',
  ON_LOAN: 'Đang mượn',
  GOOD: 'Tốt',
  DAMAGED: 'Hỏng',
  LOST: 'Mất',
  WITHDRAWN: 'Đã thanh lý',
  BORROWING: 'Đang mượn',
  PARTIALLY_RETURNED: 'Đã trả một phần',
  RETURNED: 'Đã đóng phiếu',
  OPEN: 'Chưa xử lý',
  RESOLVED: 'Đã xử lý',
  OVERDUE: 'Quá hạn',
  DUE_SOON: 'Sắp đến hạn',
  GENERAL: 'Thông tin',
  STUDENT: 'Sinh viên',
  LECTURER: 'Giảng viên',
};
export const label = (s: string) => labels[s] || s;
export function Badge({ value }: { value: string }) {
  return <span className={'status status-' + value.toLowerCase()}>{label(value)}</span>;
}
export function Alert({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="alert alert-danger">
      {error instanceof Error ? error.message : String(error)}
      {error instanceof ApiError && Object.entries(error.fieldErrors).length > 0 && (
        <ul className="mb-0">
          {Object.entries(error.fieldErrors).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function Empty({ children = 'Chưa có dữ liệu.' }: { children?: ReactNode }) {
  return (
    <div className="empty">
      <span>⌑</span>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="py-5 text-center" role="status">
      <span className="spinner-border spinner-border-sm me-2" />
      Đang tải dữ liệu…
    </div>
  );
}
export function useQuery<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    api<T>(path)
      .then((d) => {
        if (live) setData(d);
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
  }, [path, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function QueryState({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  return loading ? <Loading /> : error ? <Alert error={error} /> : <>{children}</>;
}
export function Pagination({
  data,
  onPage,
}: {
  data?: Page<unknown>;
  onPage: (n: number) => void;
}) {
  if (!data) return null;
  return (
    <div className="pagination-bar">
      <span>
        {data.totalElements} kết quả · Trang {data.page + 1}/{Math.max(1, data.totalPages)}
      </span>
      <div>
        <button
          className="btn btn-sm btn-outline-secondary me-2"
          disabled={data.page === 0}
          onClick={() => onPage(data.page - 1)}
        >
          Trước
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          disabled={data.page + 1 >= data.totalPages}
          onClick={() => onPage(data.page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow || 'THƯ VIỆN ĐẠI HỌC'}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export type Values = Record<string, string>;
export interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  step?: string;
  hint?: string;
}
export function Form({
  fields,
  initial = {},
  onSubmit,
  submit = 'Lưu thay đổi',
}: {
  fields: Field[];
  initial?: Values;
  onSubmit: (v: Values) => Promise<void>;
  submit?: string;
}) {
  const [values, setValues] = useState<Values>(initial);
  const formId = useId();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit(values);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save}>
      <Alert error={error} />
      <div className="row g-3">
        {fields.map((f) => (
          <div className={f.type === 'textarea' ? 'col-12' : 'col-12 col-md-6'} key={f.name}>
            <label className="form-label" htmlFor={formId + f.name}>
              {f.label}
              {f.required !== false && (
                <span className="text-danger" aria-hidden="true">
                  {' '}
                  *
                </span>
              )}
            </label>
            {f.options ? (
              <select
                id={formId + f.name}
                aria-invalid={error instanceof ApiError && !!error.fieldErrors[f.name]}
                aria-describedby={formId + f.name + '-hint'}
                className={
                  'form-select' +
                  (error instanceof ApiError && error.fieldErrors[f.name] ? ' is-invalid' : '')
                }
                required={f.required !== false}
                value={values[f.name] || ''}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              >
                <option value="">Chọn…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                id={formId + f.name}
                aria-invalid={error instanceof ApiError && !!error.fieldErrors[f.name]}
                aria-describedby={formId + f.name + '-hint'}
                className={
                  'form-control' +
                  (error instanceof ApiError && error.fieldErrors[f.name] ? ' is-invalid' : '')
                }
                rows={3}
                required={f.required !== false}
                value={values[f.name] || ''}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            ) : (
              <input
                id={formId + f.name}
                aria-invalid={error instanceof ApiError && !!error.fieldErrors[f.name]}
                aria-describedby={formId + f.name + '-hint'}
                className={
                  'form-control' +
                  (error instanceof ApiError && error.fieldErrors[f.name] ? ' is-invalid' : '')
                }
                type={f.type || 'text'}
                min={f.min}
                step={f.step}
                required={f.required !== false}
                value={values[f.name] || ''}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
            )}
            <div id={formId + f.name + '-hint'}>
              {error instanceof ApiError && error.fieldErrors[f.name] && (
                <div className="invalid-feedback d-block">{error.fieldErrors[f.name]}</div>
              )}
              <small className="text-secondary">{f.hint}</small>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary mt-4" disabled={busy}>
        {busy ? 'Đang lưu…' : submit}
      </button>
    </form>
  );
}
export const options = (values: string[]) => values.map((v) => ({ value: v, label: label(v) }));
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <BootstrapModal show onHide={onClose} centered size="lg" aria-label={title}>
      <BootstrapModal.Header closeButton closeLabel="Đóng">
        <BootstrapModal.Title as="h2" className="h4">
          {title}
        </BootstrapModal.Title>
      </BootstrapModal.Header>
      <BootstrapModal.Body>{children}</BootstrapModal.Body>
    </BootstrapModal>
  );
}
export function Action({
  children,
  onClick,
  confirm,
  className = 'btn btn-sm btn-outline-primary',
}: {
  children: ReactNode;
  onClick: () => Promise<void>;
  confirm?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <span className="action">
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setBusy(true);
          setError(undefined);
          try {
            await onClick();
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Đang xử lý…' : children}
      </button>
      {error ? <Alert error={error} /> : null}
    </span>
  );
}
