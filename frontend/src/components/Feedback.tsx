import { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
export function Feedback() {
  const [notice, setNotice] = useState<{ message: string; error: boolean; id: number }>();
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setNotice({ ...detail, id: Date.now() });
    };
    window.addEventListener('api-feedback', handle);
    return () => window.removeEventListener('api-feedback', handle);
  }, []);
  return (
    <ToastContainer position="bottom-end" className="p-3 feedback-container">
      <Toast
        key={notice?.id}
        show={!!notice}
        onClose={() => setNotice(undefined)}
        autohide
        delay={4500}
        aria-label="Thông báo thao tác"
      >
        <Toast.Header closeLabel="Đóng thông báo">
          <strong className="me-auto">
            {notice?.error ? 'Không thể hoàn tất' : 'Đã hoàn tất'}
          </strong>
        </Toast.Header>
        <Toast.Body>{notice?.message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
