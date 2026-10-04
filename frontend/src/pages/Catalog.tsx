import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookCard } from '../components/BookCard';
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
  options,
  type Field,
  type Values,
  date,
} from '../ui';
import type { Book, Category, Item, Page } from '../types';
const bookFields = (categories: Category[]): Field[] => [
  { name: 'title', label: 'Tên sách' },
  { name: 'author', label: 'Tác giả' },
  { name: 'isbn', label: 'ISBN' },
  { name: 'publisher', label: 'Nhà xuất bản', required: false },
  { name: 'publicationYear', label: 'Năm xuất bản', type: 'number', min: 1000 },
  {
    name: 'categoryId',
    label: 'Thể loại',
    options: categories.map((c) => ({ value: String(c.id), label: c.name })),
  },
  { name: 'description', label: 'Mô tả', type: 'textarea', required: false },
];
const bookPayload = (v: Values) => ({
  ...v,
  publicationYear: Number(v.publicationYear),
  categoryId: Number(v.categoryId),
});
export function Catalog() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const staff = user!.role !== 'READER';
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: '',
    publisher: '',
    yearFrom: '',
    yearTo: '',
    available: false,
    sort: 'title',
  });
  const [page, setPage] = useState(0);
  const [create, setCreate] = useState(false);
  const params = new URLSearchParams({ page: String(page), size: '12' });
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== '' && v !== false) params.set(k, String(v));
  });
  const query = useQuery<Page<Book>>('/books?' + params);
  const cats = useQuery<Category[]>('/categories');
  const update = (k: string, v: string | boolean) => {
    setFilters({ ...filters, [k]: v });
    setPage(0);
  };
  return (
    <>
      <PageTitle
        eyebrow="KHÁM PHÁ & HỌC TẬP"
        title="Danh mục sách"
        description="Tìm tài liệu phù hợp cho hành trình học tập của bạn."
        action={
          staff && (
            <button className="btn btn-primary" onClick={() => setCreate(true)}>
              ＋ Thêm đầu sách
            </button>
          )
        }
      />
      <section className="catalog-banner">
        <div>
          <span className="eyebrow">TRI THỨC LUÔN TRONG TẦM TAY</span>
          <h2>
            Hôm nay, bạn muốn
            <br />
            khám phá điều gì?
          </h2>
          <p>Tra cứu đầu sách và kiểm tra các cuốn sẵn có tại thư viện.</p>
        </div>
        <div className="banner-books" aria-hidden="true">
          <div>
            ĐỌC
            <br />
            ĐỂ
            <br />
            <strong>HIỂU</strong>
          </div>
          <div>
            HỌC
            <br />
            ĐỂ
            <br />
            <strong>MỞ</strong>
          </div>
          <div>
            NGHĨ
            <br />
            ĐỂ
            <br />
            <strong>TẠO</strong>
          </div>
        </div>
      </section>
      <section className="panel mb-4">
        <div className="row g-3">
          <div className="col-lg-5">
            <label className="form-label" htmlFor="search">
              Tìm kiếm sách
            </label>
            <input
              id="search"
              className="form-control"
              placeholder="Tên sách, tác giả hoặc ISBN…"
              value={filters.q}
              onChange={(e) => update('q', e.target.value)}
            />
          </div>
          <div className="col-md-4 col-lg-3">
            <label className="form-label" htmlFor="filter-category">
              Thể loại
            </label>
            <select
              id="filter-category"
              className="form-select"
              value={filters.category}
              onChange={(e) => update('category', e.target.value)}
            >
              <option value="">Tất cả thể loại</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-lg-2">
            <label className="form-label" htmlFor="sort">
              Sắp xếp
            </label>
            <select
              id="sort"
              className="form-select"
              value={filters.sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="title">Tên sách A–Z</option>
              <option value="publicationYear">Năm xuất bản</option>
              <option value="createdAt">Ngày thêm</option>
            </select>
          </div>
          <div className="col-md-4 col-lg-2 d-flex align-items-end">
            <label className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={filters.available}
                onChange={(e) => update('available', e.target.checked)}
              />{' '}
              Còn cuốn sẵn có
            </label>
          </div>
        </div>
        <details className="mt-3">
          <summary>Bộ lọc nâng cao</summary>
          <div className="row g-3 mt-1">
            {[
              ['publisher', 'Nhà xuất bản'],
              ['yearFrom', 'Từ năm'],
              ['yearTo', 'Đến năm'],
            ].map(([k, l]) => (
              <div className="col-md-4" key={k}>
                <label className="form-label" htmlFor={'filter-' + k}>
                  {l}
                </label>
                <input
                  id={'filter-' + k}
                  className="form-control"
                  type={k === 'publisher' ? 'text' : 'number'}
                  value={filters[k as keyof typeof filters] as string}
                  onChange={(e) => update(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        </details>
      </section>
      <QueryState {...query}>
        {query.data?.content.length ? (
          <div className="book-grid">
            {query.data.content.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        ) : (
          <Empty>Không tìm thấy sách phù hợp với bộ lọc.</Empty>
        )}
        <Pagination data={query.data} onPage={setPage} />
      </QueryState>
      {create && (
        <Modal title="Thêm đầu sách" onClose={() => setCreate(false)}>
          <Form
            fields={bookFields(cats.data || [])}
            onSubmit={async (v) => {
              await api('/books', 'POST', bookPayload(v));
              setCreate(false);
              query.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const staff = user!.role !== 'READER';
  const book = useQuery<Book>('/books/' + id);
  const items = useQuery<Item[]>('/books/' + id + '/items');
  const cats = useQuery<Category[]>('/categories');
  const [modal, setModal] = useState<'edit' | 'add' | 'logs' | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [file, setFile] = useState<File>();
  const locationOnly = item != null && ['ON_LOAN', 'LOST', 'WITHDRAWN'].includes(item.status);
  const reload = () => {
    book.reload();
    items.reload();
  };
  const b = book.data;
  return (
    <>
      <Link to="/">← Danh mục sách</Link>
      <QueryState {...book}>
        {b && (
          <>
            <PageTitle
              title={b.title}
              description={b.author}
              action={
                staff && (
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary" onClick={() => setModal('edit')}>
                      Sửa thông tin
                    </button>
                    <Action
                      confirm="Xóa mềm đầu sách này? Lịch sử vẫn được giữ lại."
                      onClick={async () => {
                        await api('/books/' + id, 'DELETE');
                        reload();
                      }}
                    >
                      Xóa mềm
                    </Action>
                  </div>
                )
              }
            />
            <div className="row g-4">
              <div className="col-lg-4">
                <div className={'book-cover detail-cover cover-' + (b.id % 4)}>
                  {b.coverImageUrl ? (
                    <img src={b.coverImageUrl} alt={b.title} />
                  ) : (
                    <>
                      <small>THƯ VIỆN ĐẠI HỌC</small>
                      <strong>{b.title}</strong>
                      <span>{b.author}</span>
                    </>
                  )}
                </div>
                {staff && (
                  <section className="panel mt-3">
                    <label className="form-label" htmlFor="cover-file">
                      Ảnh bìa PNG/JPEG · tối đa 5 MB
                    </label>
                    <input
                      id="cover-file"
                      type="file"
                      accept="image/png,image/jpeg"
                      className="form-control mb-3"
                      onChange={(e) => setFile(e.target.files?.[0])}
                    />
                    <Action
                      onClick={async () => {
                        if (!file) throw new Error('Vui lòng chọn ảnh.');
                        if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5 MB.');
                        if (!['image/png', 'image/jpeg'].includes(file.type))
                          throw new Error('Chỉ nhận ảnh PNG/JPEG.');
                        const form = new FormData();
                        form.append('file', file);
                        await api('/books/' + id + '/cover', 'POST', form);
                        book.reload();
                      }}
                    >
                      Tải ảnh bìa
                    </Action>
                  </section>
                )}
              </div>
              <div className="col-lg-8">
                <section className="panel">
                  <h2 className="h5 mb-4">Thông tin ấn bản</h2>
                  <dl className="info-list">
                    <dt>ISBN</dt>
                    <dd>{b.isbn}</dd>
                    <dt>Thể loại</dt>
                    <dd>{b.categoryName}</dd>
                    <dt>Nhà xuất bản</dt>
                    <dd>{b.publisher || '—'}</dd>
                    <dt>Năm xuất bản</dt>
                    <dd>{b.publicationYear}</dd>
                    <dt>Khả dụng</dt>
                    <dd>
                      {b.availableItems} cuốn {b.deleted && '· Đầu sách đã xóa mềm'}
                    </dd>
                  </dl>
                  <p className="text-secondary mt-4">{b.description || 'Chưa có mô tả.'}</p>
                  {!staff && (
                    <div className="alert alert-info mt-3">
                      <strong>Mượn sách tại quầy</strong>
                      <p className="mb-0">
                        Ghi lại mã vạch cuốn sẵn có và liên hệ thủ thư. Phiếu mượn được lập khi giao
                        sách thực tế.
                      </p>
                    </div>
                  )}
                  {staff && (
                    <button className="btn btn-link p-0" onClick={() => setModal('logs')}>
                      Xem nhật ký thay đổi
                    </button>
                  )}
                </section>
                <section className="panel mt-4">
                  <div className="d-flex justify-content-between mb-3">
                    <h2 className="h5">Các cuốn tại thư viện</h2>
                    {staff && (
                      <button className="btn btn-sm btn-primary" onClick={() => setModal('add')}>
                        ＋ Thêm cuốn
                      </button>
                    )}
                  </div>
                  <QueryState {...items}>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Mã vạch</th>
                            <th>Vị trí</th>
                            <th>Tình trạng</th>
                            <th>Trạng thái</th>
                            {staff && <th>Thao tác</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {items.data?.map((i) => (
                            <tr key={i.id}>
                              <td>{i.barcode}</td>
                              <td>{i.location}</td>
                              <td>
                                <Badge value={i.condition} />
                              </td>
                              <td>
                                <Badge value={i.status} />
                              </td>
                              {staff && (
                                <td className="text-nowrap">
                                  <button
                                    className="btn btn-sm btn-light me-1"
                                    onClick={() => setItem(i)}
                                  >
                                    Sửa
                                  </button>
                                  <Action
                                    confirm="Thanh lý cuốn này?"
                                    onClick={async () => {
                                      await api('/items/' + i.id, 'DELETE');
                                      reload();
                                    }}
                                  >
                                    Thanh lý
                                  </Action>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!items.data?.length && <Empty />}
                  </QueryState>
                </section>
              </div>
            </div>
          </>
        )}
      </QueryState>
      {modal === 'edit' && b && (
        <Modal title="Sửa thông tin đầu sách" onClose={() => setModal(null)}>
          <Form
            fields={bookFields(cats.data || [])}
            initial={Object.fromEntries(Object.entries(b).map(([k, v]) => [k, String(v ?? '')]))}
            onSubmit={async (v) => {
              await api('/books/' + id, 'PUT', bookPayload(v));
              setModal(null);
              reload();
            }}
          />
        </Modal>
      )}
      {modal === 'add' && (
        <Modal title="Thêm cuốn vật lý" onClose={() => setModal(null)}>
          <Form
            fields={[
              { name: 'barcodes', label: 'Mã vạch (mỗi dòng một mã)', type: 'textarea' },
              { name: 'location', label: 'Vị trí trên kệ' },
            ]}
            onSubmit={async (v) => {
              await api(
                '/books/' + id + '/items',
                'POST',
                v.barcodes
                  .split(/\n/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((barcode) => ({ barcode, location: v.location })),
              );
              setModal(null);
              reload();
            }}
          />
        </Modal>
      )}
      {item && (
        <Modal title={'Cập nhật ' + item.barcode} onClose={() => setItem(null)}>
          {locationOnly && (
            <p className="text-secondary">
              Cuốn đang mượn, bị mất hoặc đã thanh lý chỉ được cập nhật vị trí tại đây. Tình trạng
              được giữ nguyên.
            </p>
          )}
          <Form
            initial={{ location: item.location, condition: item.condition }}
            fields={[
              { name: 'location', label: 'Vị trí' },
              ...(!locationOnly
                ? [
                    {
                      name: 'condition',
                      label: 'Tình trạng',
                      options: options(['GOOD', 'DAMAGED']),
                    },
                  ]
                : []),
            ]}
            onSubmit={async (v) => {
              if (locationOnly)
                await api('/items/' + item.id + '/location', 'PATCH', {
                  barcode: item.barcode,
                  location: v.location,
                });
              else await api('/items/' + item.id, 'PUT', v);
              setItem(null);
              reload();
            }}
          />
        </Modal>
      )}
      {modal === 'logs' && (
        <Modal title="Nhật ký thay đổi" onClose={() => setModal(null)}>
          <BookLogs id={id!} />
        </Modal>
      )}
    </>
  );
}
function BookLogs({ id }: { id: string }) {
  const q = useQuery<{ id: number; actor: string; description: string; createdAt: string }[]>(
    '/books/' + id + '/changes',
  );
  return (
    <QueryState {...q}>
      {q.data?.map((l) => (
        <article className="border-bottom py-3" key={l.id}>
          <strong>{l.actor}</strong>
          <small className="d-block">{date(l.createdAt)}</small>
          <p className="text-break mt-2">{l.description}</p>
        </article>
      ))}
    </QueryState>
  );
}
export function Categories() {
  const q = useQuery<Category[]>('/categories');
  const [edit, setEdit] = useState<Category | boolean>(false);
  return (
    <>
      <PageTitle
        title="Quản lý thể loại"
        action={
          <button className="btn btn-primary" onClick={() => setEdit(true)}>
            ＋ Thêm thể loại
          </button>
        }
      />
      <section className="panel">
        <QueryState {...q}>
          {q.data?.map((c) => (
            <div className="list-row" key={c.id}>
              <div>
                <h2 className="h6">{c.name}</h2>
                <p className="text-secondary mb-0">{c.description}</p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-light" onClick={() => setEdit(c)}>
                  Sửa
                </button>
                <Action
                  confirm="Xóa thể loại này?"
                  onClick={async () => {
                    await api('/categories/' + c.id, 'DELETE');
                    q.reload();
                  }}
                >
                  Xóa
                </Action>
              </div>
            </div>
          ))}
          {!q.data?.length && <Empty />}
        </QueryState>
      </section>
      {edit && (
        <Modal
          title={edit === true ? 'Thêm thể loại' : 'Sửa thể loại'}
          onClose={() => setEdit(false)}
        >
          <Form
            fields={[
              { name: 'name', label: 'Tên thể loại' },
              { name: 'description', label: 'Mô tả', type: 'textarea', required: false },
            ]}
            initial={
              typeof edit === 'object'
                ? { name: edit.name, description: edit.description || '' }
                : {}
            }
            onSubmit={async (v) => {
              await api(
                '/categories' + (typeof edit === 'object' ? '/' + edit.id : ''),
                typeof edit === 'object' ? 'PUT' : 'POST',
                v,
              );
              setEdit(false);
              q.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
