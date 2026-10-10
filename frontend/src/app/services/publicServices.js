// Public reads deliberately avoid the authenticated client's session-expired modal.
export async function publicRequest(path, options = {}) {
  const origin = process.env.NEXT_PUBLIC_API_URL;
  if (!origin) throw new Error('API no configurada');
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000);
  const response = await fetch(`${origin}/api${path}`, {
    ...options,
    signal
  });
  if (!response.ok) throw Object.assign(new Error('No pudimos cargar los datos'), {
    status: response.status
  });
  return response.json();
}
export async function getPublicSession(signal) {
  const options = {
    credentials: 'include',
    signal,
    cache: 'no-store'
  };
  try {
    return (await publicRequest('/session-summary/', options)).data?.home ?? null;
  } catch (error) {
    if (error.status !== 401) throw error;
    try {
      const csrf = await publicRequest('/csrf/', options);
      await publicRequest('/refresh/', {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf.data.csrf_token
        },
        body: '{}'
      });
      return (await publicRequest('/session-summary/', options)).data?.home ?? null;
    } catch (refreshError) {
      if (refreshError.status === 401 || refreshError.status === 403) return null;
      throw refreshError;
    }
  }
}
