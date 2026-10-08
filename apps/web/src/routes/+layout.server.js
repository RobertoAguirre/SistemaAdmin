import { env } from '$env/dynamic/private';

export function load() {
  const apiUrl = (env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return { apiUrl };
}
