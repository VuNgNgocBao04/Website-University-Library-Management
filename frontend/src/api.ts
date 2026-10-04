let csrf: { token: string; headerName: string } | null = null;
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function refreshCsrf() {
  const response = await fetch('/api/auth/csrf', { credentials: 'include' });
  if (!response.ok) throw new Error('Không kết nối được máy chủ.');
  csrf = await response.json();
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    if (!csrf) await refreshCsrf();
    headers[csrf!.headerName] = csrf!.token;
  }
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const response = await fetch('/api' + path, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Không kết nối được máy chủ.' }));
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('session-expired'));
    if (method !== 'GET' && !path.startsWith('/auth/'))
      window.dispatchEvent(
        new CustomEvent('api-feedback', {
          detail: { message: error.message || 'Thao tác thất bại.', error: true },
        }),
      );
    throw new ApiError(response.status, error.message || 'Thao tác thất bại.', error.fieldErrors);
  }
  const text = await response.text();
  if (method !== 'GET' && !path.startsWith('/auth/'))
    window.dispatchEvent(
      new CustomEvent('api-feedback', { detail: { message: 'Thao tác hoàn tất.', error: false } }),
    );
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
export async function download(path: string, filename: string) {
  const res = await fetch('/api' + path, { credentials: 'include' });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.message);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
