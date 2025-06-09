import { useApi } from '../../hooks/useApi';

  const { apiFetch } = useApi();
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body:   data,
  });
  const resData = await res.json();