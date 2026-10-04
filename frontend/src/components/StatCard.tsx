import { Link } from 'react-router-dom';
export function StatCard({
  title,
  value,
  hint,
  to,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  to: string;
  icon: string;
}) {
  return (
    <Link className="panel stat-card" to={to}>
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{title}</span>
      <strong>{value.toLocaleString('vi-VN')}</strong>
      <small>
        {hint} <span aria-hidden="true">→</span>
      </small>
    </Link>
  );
}
