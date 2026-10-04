import { useNavigate, useLocation } from 'react-router-dom';
import { api, refreshCsrf } from '../api';
import { useAuth } from '../auth';
import { Form } from '../ui';
import type { Account } from '../types';
export function LoginForm() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Form
      fields={[
        { name: 'username', label: 'Tên đăng nhập' },
        { name: 'password', label: 'Mật khẩu', type: 'password' },
      ]}
      submit="Đăng nhập"
      onSubmit={async (v) => {
        const user = await api<Account>('/auth/login', 'POST', v);
        await refreshCsrf();
        setUser(user);
        const destination = location.state?.from;
        navigate(
          typeof destination === 'string' &&
            destination.startsWith('/') &&
            !destination.startsWith('//')
            ? destination
            : '/',
          { replace: true },
        );
      }}
    />
  );
}
