import type { ReactNode } from 'react';
import { Table } from 'react-bootstrap';
import { Empty } from '../ui';

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
}: {
  rows: T[];
  columns: { title: string; render: (row: T) => ReactNode }[];
  rowKey: (row: T) => string | number;
  caption: string;
}) {
  return rows.length ? (
    <Table responsive hover>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th scope="col" key={c.title}>
              {c.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((c) => (
              <td key={c.title}>{c.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  ) : (
    <Empty />
  );
}
