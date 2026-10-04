import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Form, PageTitle, Badge } from '../ui';
import { LoginForm } from '../components/LoginForm';
import { Brand } from '../components/Layouts';
import type { Account } from '../types';
export function Login() {
  return (
    <div className="auth-shell">
      <main className="auth-form">
        <Brand />
        <h1 className="h3 mt-4">Đăng nhập thư viện</h1>
        <p className="text-secondary">Sử dụng tài khoản do nhà trường cung cấp.</p>
        <LoginForm />
        <Link className="d-inline-block mt-4" to="/forgot-password">
          Quên mật khẩu?
        </Link>
        <div className="auth-note">
          Chưa có tài khoản? Liên hệ quản trị viên thư viện để được cấp tài khoản.
        </div>
        <Link className="d-block mt-3" to="/home">
          ← Trang chủ thư viện
        </Link>
      </main>
    </div>
  );
}
export function PasswordRecovery() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [message, setMessage] = useState('');
  return (
    <div className="recovery">
      <Link className="brand text-dark mb-5" to="/login">
        ▥ UniLib
      </Link>
      <h1 className="h3">{token ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}</h1>
      <p className="text-secondary">
        {token
          ? 'Nhập mật khẩu mới, ít nhất 10 ký tự.'
          : 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'}
      </p>
      {message ? (
        <div role="status" className="alert alert-success">
          {message}
        </div>
      ) : (
        <Form
          fields={
            token
              ? [{ name: 'password', label: 'Mật khẩu mới', type: 'password' }]
              : [{ name: 'email', label: 'Email', type: 'email' }]
          }
          submit={token ? 'Đặt lại mật khẩu' : 'Gửi liên kết'}
          onSubmit={async (v) => {
            if (token) {
              await api('/auth/reset-password', 'POST', { token, password: v.password });
              setMessage('Đã đặt lại mật khẩu. Bạn có thể đăng nhập.');
            } else {
              const r = await api<{ message: string }>('/auth/forgot-password', 'POST', v);
              setMessage(r.message);
            }
          }}
        />
      )}
      <Link className="d-inline-block mt-4" to="/login">
        ← Quay lại đăng nhập
      </Link>
    </div>
  );
}
export function Profile() {
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState('');
  return (
    <>
      <PageTitle title="Hồ sơ cá nhân" description="Thông tin liên hệ và bảo mật tài khoản." />
      <div className="row g-4">
        <div className="col-lg-7">
          <section className="panel">
            <div className="d-flex gap-3 align-items-center mb-4">
              <div className="avatar large">{user!.fullName.charAt(0)}</div>
              <div>
                <h2 className="h5">{user!.fullName}</h2>
                <Badge value={user!.role} />
              </div>
            </div>
            {message && <div className="alert alert-success">{message}</div>}
            <Form
              initial={{
                fullName: user!.fullName,
                email: user!.email,
                phoneNumber: user!.phoneNumber || '',
              }}
              fields={[
                { name: 'fullName', label: 'Họ tên' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'phoneNumber', label: 'Số điện thoại', required: false },
              ]}
              onSubmit={async (v) => {
                setUser(await api<Account>('/auth/profile', 'PUT', v));
                setMessage('Đã cập nhật hồ sơ.');
              }}
            />
          </section>
        </div>
        <div className="col-lg-5">
          <section className="panel">
            <h2 className="h5 mb-4">Đổi mật khẩu</h2>
            <Form
              fields={[
                { name: 'currentPassword', label: 'Mật khẩu hiện tại', type: 'password' },
                {
                  name: 'newPassword',
                  label: 'Mật khẩu mới',
                  type: 'password',
                  hint: 'Từ 10 đến 72 ký tự.',
                },
              ]}
              submit="Đổi mật khẩu và đăng nhập lại"
              onSubmit={async (v) => {
                await api('/auth/password', 'POST', v);
                setUser(null);
              }}
            />
          </section>
        </div>
      </div>
    </>
  );
}
