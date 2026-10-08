import { createClient } from '@supabase/supabase-js';

function credenciales() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const error = new Error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY en el servidor');
    error.status = 500;
    throw error;
  }
  return { url, anon };
}

const opciones = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
};

export function clienteAnon() {
  const { url, anon } = credenciales();
  return createClient(url, anon, opciones);
}

export function clienteConToken(token) {
  const { url, anon } = credenciales();
  return createClient(url, anon, {
    ...opciones,
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
