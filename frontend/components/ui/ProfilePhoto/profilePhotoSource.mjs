export const DEFAULT_PROFILE_PHOTO = '/images/foto_default.png';

export function resolveProfilePhoto(value, apiBase = '') {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_PROFILE_PHOTO;
  const source = value.trim();
  if (source.startsWith('/images/')) return source;
  try {
    const media = /^\/?media\//.test(source);
    if (media && !apiBase) return source.startsWith('/') ? source : `/${source}`;
    const url = media ? new URL(`/${source.replace(/^\//, '')}`, new URL(apiBase).origin) : new URL(source);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return DEFAULT_PROFILE_PHOTO;
    if (url.hostname === 'res.cloudinary.com') url.protocol = 'https:';
    return url.href;
  } catch {
    return DEFAULT_PROFILE_PHOTO;
  }
}
