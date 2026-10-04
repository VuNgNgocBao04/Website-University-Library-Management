import { Link } from 'react-router-dom';
import type { Book } from '../types';

export function BookCard({ book: b }: { book: Book }) {
  return (
    <Link className="book-card" to={'/books/' + b.id} aria-label={'Xem sách: ' + b.title}>
      <div className={'book-cover cover-' + (b.id % 4)}>
        {b.coverImageUrl ? (
          <img src={b.coverImageUrl} alt="" loading="lazy" />
        ) : (
          <>
            <small>THƯ VIỆN ĐẠI HỌC</small>
            <strong>{b.title}</strong>
            <span>{b.author}</span>
            <i aria-hidden="true">▥</i>
          </>
        )}
      </div>
      <div className="book-info">
        <small>{b.categoryName}</small>
        <h3>{b.title}</h3>
        <p>{b.author}</p>
        <div className="d-flex justify-content-between flex-wrap gap-2">
          <span className={'availability ' + (!b.availableItems ? 'unavailable' : '')}>
            {b.availableItems ? `✓ Còn sách · ${b.availableItems} cuốn` : '— Hết sách'}
          </span>
          <span className="text-secondary">{b.publicationYear}</span>
        </div>
        <span className="book-card-action">
          Xem chi tiết & hướng dẫn mượn <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
