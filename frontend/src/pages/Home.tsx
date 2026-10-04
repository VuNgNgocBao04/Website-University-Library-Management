import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function Home() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = user && user.role !== 'READER';
  const services = [
    [
      '01',
      'Tra cứu tài liệu',
      'Tìm đầu sách, thông tin ấn bản và các cuốn còn sẵn có.',
      '/',
      'Mở danh mục',
    ],
    [
      '02',
      staff ? 'Không gian quản lý' : 'Sách của bạn',
      staff
        ? 'Theo dõi hoạt động thư viện trong bảng tổng quan.'
        : 'Theo dõi hạn trả và xem lại hành trình đọc của bạn.',
      staff ? '/dashboard' : '/current',
      staff ? 'Mở tổng quan' : 'Xem sách đang mượn',
    ],
    [
      '03',
      'Thông báo thư viện',
      'Xem nhắc hạn và các thông báo dành cho tài khoản của bạn.',
      '/notifications',
      'Xem thông báo',
    ],
  ];
  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <span className="eyebrow">UNILIB · KHÔNG GIAN HỌC TẬP & NGHIÊN CỨU</span>
          <h1 id="home-title">
            Mở trang sách.
            <br />
            <span>Mở rộng tri thức.</span>
          </h1>
          <p>
            Kết nối với tri thức, nuôi dưỡng những ý tưởng mới.
            <br className="d-none d-md-block" /> Thư viện đồng hành cùng bạn trong học tập và nghiên
            cứu.
          </p>
          <a className="home-hero-link" href="#home-search">
            Bắt đầu tìm tài liệu <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="home-library-art" aria-hidden="true">
          <div className="library-arch">
            <span className="arch-label">HỌC HỎI. KHÁM PHÁ. SÁNG TẠO.</span>
            <div className="library-shelf">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="library-shelf second">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="library-art-caption">
              Một trang sách.
              <br />
              <em>Một góc nhìn mới.</em>
            </div>
          </div>
        </div>
      </section>
      <section className="home-search-panel" aria-labelledby="search-title">
        <div className="home-search-heading">
          <h2 id="search-title">Bạn đang tìm tài liệu nào?</h2>
          <span>SÁCH · GIÁO TRÌNH · TÀI LIỆU THAM KHẢO</span>
        </div>
        <form
          className="hero-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate('/?q=' + encodeURIComponent(search.trim()));
          }}
        >
          <label className="visually-hidden" htmlFor="home-search">
            Tìm theo tên sách, tác giả hoặc ISBN
          </label>
          <input
            id="home-search"
            type="search"
            className="form-control"
            placeholder="Nhập tên sách, tác giả hoặc ISBN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-accent">
            Tra cứu sách <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="home-search-help">
          <span>
            {user
              ? 'Tìm kiếm theo từ khóa hoặc khám phá toàn bộ danh mục.'
              : 'Đăng nhập bằng tài khoản được cấp để xem danh mục tài liệu.'}
          </span>
          <Link to="/">Xem toàn bộ danh mục →</Link>
        </div>
      </section>
      <section className="home-services" aria-labelledby="services-title">
        <div className="home-section-heading">
          <div>
            <span className="eyebrow">DỊCH VỤ THƯ VIỆN</span>
            <h2 id="services-title">Mọi điều bạn cần, ngay tại đây.</h2>
          </div>
          <p>
            Tra cứu thuận tiện.
            <br />
            Theo dõi dễ dàng.
          </p>
        </div>
        <div className="row g-4">
          {services.map(([n, title, description, to, action]) => (
            <div className="col-md-4" key={n}>
              <Link className="home-service-card" to={to}>
                <span className="service-number">{n}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="home-service-action">
                  {action}
                  <span aria-hidden="true">↗</span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="home-borrow-guide" aria-labelledby="guide-title">
        <div className="home-guide-intro">
          <span className="eyebrow">DÀNH CHO BẠN ĐỌC</span>
          <h2 id="guide-title">
            Từ trang tra cứu
            <br />
            đến cuốn sách trên tay.
          </h2>
          <p>Ba bước để bắt đầu. Thủ thư luôn sẵn sàng hỗ trợ bạn tại quầy.</p>
          <Link className="btn btn-primary" to="/">
            Khám phá danh mục →
          </Link>
        </div>
        <ol className="home-steps">
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <h3>Tìm tài liệu phù hợp</h3>
              <p>
                Tra cứu theo tên sách, tác giả hoặc ISBN. Xem vị trí và tình trạng từng cuốn trong
                trang chi tiết.
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <h3>Nhận sách tại quầy</h3>
              <p>
                Chọn cuốn sách và liên hệ thủ thư. Phiếu mượn được lập khi bạn nhận sách thực tế.
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <h3>Theo dõi và trả đúng hạn</h3>
              <p>
                Xem hạn trả trong mục Đang mượn, đọc thông báo nhắc hạn và mang sách đến quầy để
                trả.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section className="home-support" aria-labelledby="support-title">
        <div>
          <span className="eyebrow">HỖ TRỢ SỬ DỤNG</span>
          <h2 id="support-title">Bạn cần hỗ trợ?</h2>
          <p>Liên hệ quầy thủ thư để được hướng dẫn tìm sách, mượn trả hoặc cấp tài khoản.</p>
        </div>
        <Link className="btn btn-outline-primary" to={user ? '/profile' : '/forgot-password'}>
          {user ? 'Quản lý hồ sơ cá nhân' : 'Khôi phục mật khẩu'} →
        </Link>
      </section>
    </div>
  );
}
