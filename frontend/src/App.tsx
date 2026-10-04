import { type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Loading, PageTitle } from './ui';
import { Login, PasswordRecovery, Profile } from './pages/AuthPages';
import { Catalog, BookDetail, Categories } from './pages/Catalog';
import { Loans, Violations } from './pages/Circulation';
import { Accounts, Rules, Notifications, Reports } from './pages/Administration';
import { RoleLayout, PublicLayout } from './components/Layouts';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Feedback } from './components/Feedback';
import type { Role } from './types';
function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
function PreOrder() {
  return (
    <>
      <PageTitle title="Pre-Order" />
      <section className="coming-soon">
        <div>◇</div>
        <span className="eyebrow">ĐỊNH HƯỚNG PHÁT TRIỂN</span>
        <h2>Sắp phát triển</h2>
        <p>
          Pre-Order thuộc định hướng mua bán trong tương lai.
          <br />
          Hiện chưa có chức năng đặt hàng.
        </p>
      </section>
    </>
  );
}
export default function App() {
  return (
    <>
      <Feedback />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/home" element={<Home />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<PasswordRecovery />} />
        <Route path="/reset-password" element={<PasswordRecovery />} />
        <Route
          element={
            <Guard>
              <RoleLayout />
            </Guard>
          }
        >
          <Route index element={<Catalog />} />
          <Route
            path="dashboard"
            element={
              <Guard roles={['ADMIN', 'LIBRARIAN']}>
                <Dashboard />
              </Guard>
            }
          />
          <Route path="books/:id" element={<BookDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route
            path="current"
            element={
              <Guard roles={['READER']}>
                <Loans current />
              </Guard>
            }
          />
          <Route path="loans" element={<Loans />} />
          <Route
            path="overdue"
            element={
              <Guard roles={['ADMIN', 'LIBRARIAN']}>
                <Loans overdue />
              </Guard>
            }
          />
          <Route path="violations" element={<Violations />} />
          <Route
            path="categories"
            element={
              <Guard roles={['ADMIN', 'LIBRARIAN']}>
                <Categories />
              </Guard>
            }
          />
          <Route
            path="accounts"
            element={
              <Guard roles={['ADMIN']}>
                <Accounts />
              </Guard>
            }
          />
          <Route
            path="rules"
            element={
              <Guard roles={['ADMIN']}>
                <Rules />
              </Guard>
            }
          />
          <Route
            path="reports"
            element={
              <Guard roles={['ADMIN']}>
                <Reports />
              </Guard>
            }
          />
          <Route path="notifications" element={<Notifications />} />
          <Route path="pre-order" element={<PreOrder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
