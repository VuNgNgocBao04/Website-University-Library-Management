import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Navbar as BootstrapNavbar, Nav, Container, Offcanvas } from 'react-bootstrap';
import { useAuth } from '../auth';
import { Action, label } from '../ui';

export function Brand() {
  return (
    <Link className="brand" to="/home">
      <span className="brand-mark" aria-hidden="true">
        ▥
      </span>
      <span>
        UniLib<small>THƯ VIỆN ĐẠI HỌC</small>
      </span>
    </Link>
  );
}
export function Navbar() {
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);
  return (
    <BootstrapNavbar
      expand="lg"
      expanded={expanded}
      onToggle={setExpanded}
      fixed="top"
      className="public-navbar"
      data-bs-theme="dark"
    >
      <Container fluid="xl">
        <Brand />
        <BootstrapNavbar.Toggle
          label={expanded ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={expanded}
          aria-controls="public-menu"
        />
        <BootstrapNavbar.Collapse id="public-menu">
          <Nav
            className="ms-auto align-items-lg-center gap-lg-2"
            onClick={() => setExpanded(false)}
          >
            <NavLink className="nav-link" to="/home">
              Trang chủ
            </NavLink>
            <NavLink className="nav-link" end to="/">
              Tra cứu sách
            </NavLink>
            {user?.role === 'READER' && (
              <>
                <NavLink className="nav-link" to="/current">
                  Đang mượn
                </NavLink>
                <NavLink className="nav-link" to="/loans">
                  Lịch sử mượn
                </NavLink>
                <NavLink className="nav-link" to="/violations">
                  Vi phạm & phí
                </NavLink>
              </>
            )}
            {user && (
              <NavLink className="nav-link" to="/notifications">
                Thông báo
              </NavLink>
            )}
            {user && user.role !== 'READER' && (
              <NavLink className="nav-link" to="/dashboard">
                Quản trị
              </NavLink>
            )}
            {user ? (
              <>
                <NavLink className="nav-link" to="/profile">
                  Hồ sơ
                </NavLink>
                <Action className="btn btn-outline-light btn-sm" onClick={logout}>
                  Đăng xuất
                </Action>
              </>
            ) : (
              <Link className="btn btn-accent btn-sm" to="/login">
                Đăng nhập
              </Link>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-md-4">
            <Brand />
            <p className="mt-3">
              Đồng hành cùng học tập,
              <br />
              giảng dạy và nghiên cứu.
            </p>
          </div>
          <div className="col-6 col-md-2">
            <h2>Giờ mở cửa</h2>
            <p>Lịch phục vụ đang được cập nhật.</p>
          </div>
          <div className="col-6 col-md-3">
            <h2>Liên hệ</h2>
            <p>Liên hệ quầy thủ thư để được hỗ trợ mượn, trả và tài khoản.</p>
          </div>
          <div className="col-md-3">
            <h2>Liên kết nhanh</h2>
            <Link to="/">Tra cứu sách</Link>
            <Link to="/notifications">Tin từ thư viện</Link>
            <Link to="/pre-order">Pre-Order — Sắp phát triển</Link>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} UniLib · Thư viện đại học
        </div>
      </div>
    </footer>
  );
}
export function PublicLayout() {
  return (
    <div className="public-layout">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <Navbar />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const links = [
    ['/dashboard', '◫', 'Tổng quan'],
    ['/', '▥', 'Danh mục sách'],
    ['/categories', '▦', 'Thể loại'],
    ['/loans', '⇄', 'Mượn & trả'],
    ['/overdue', '◷', 'Quá hạn'],
    ['/violations', '⚑', 'Vi phạm & phí'],
  ];
  if (user?.role === 'ADMIN')
    links.push(
      ['/accounts', '♙', 'Tài khoản'],
      ['/rules', '≡', 'Quy định mượn'],
      ['/reports', '▤', 'Báo cáo'],
    );
  links.push(['/notifications', '♧', 'Thông báo'], ['/pre-order', '◇', 'Pre-Order']);
  return (
    <div className="sidebar-content">
      <Brand />
      <p className="nav-caption">QUẢN LÝ THƯ VIỆN</p>
      <nav aria-label="Điều hướng quản trị">
        {links.map(([path, icon, text]) => (
          <NavLink key={path} end to={path} onClick={onNavigate}>
            <span aria-hidden="true">{icon}</span>
            {text}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-note">
        Tri thức cho hôm nay.
        <br />
        Nền tảng cho ngày mai.
      </div>
    </div>
  );
}
export function AdminLayout() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <aside className="sidebar d-none d-lg-flex">
        <Sidebar />
      </aside>
      <Offcanvas
        show={menu}
        onHide={() => setMenu(false)}
        className="admin-drawer"
        aria-labelledby="menu-title"
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title id="menu-title">Điều hướng thư viện</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Sidebar onNavigate={() => setMenu(false)} />
        </Offcanvas.Body>
      </Offcanvas>
      <div className="workspace">
        <header className="topbar">
          <div className="d-flex gap-3 align-items-center">
            <button
              className="btn btn-outline-primary d-lg-none"
              aria-label="Mở menu"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              ☰
            </button>
            <span className="d-none d-sm-inline">
              Không gian quản lý{' '}
              <small className="d-block text-secondary">{label(user!.role)}</small>
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <Link className="user-menu" to="/profile">
              <span className="avatar">{user!.fullName.charAt(0)}</span>
              <span className="d-none d-md-inline">{user!.fullName}</span>
              <span className="visually-hidden">Hồ sơ</span>
            </Link>
            <Action className="btn btn-outline-primary btn-sm" onClick={logout}>
              Đăng xuất
            </Action>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
export function RoleLayout() {
  const { user } = useAuth();
  return user?.role === 'READER' ? <PublicLayout /> : <AdminLayout />;
}
