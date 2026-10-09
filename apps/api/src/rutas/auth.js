import { Router } from 'express';
import { envolver, exigirSesion, fallar } from '../http.js';
import { clienteAnon, clienteConToken } from '../supabase.js';

export const auth = Router();

async function perfilDe(supabase, usuarioId) {
  const { error: errorPerfil } = await supabase.rpc('asegurar_perfil');
  if (errorPerfil) throw errorPerfil;

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('id', usuarioId)
    .single();

  if (error) throw error;
  return data;
}

function sesionPublica(session, usuario) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    usuario
  };
}

auth.post('/registro', envolver(async (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!nombre) return res.status(400).json({ error: 'Indica el nombre' });
  if (!email || !password) return res.status(400).json({ error: 'Escribe correo y contraseña' });
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const supabase = clienteAnon();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } }
    });

    if (error) return fallar(res, error, 400);
    if (data.user?.identities?.length === 0) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    if (!data.session || !data.user) {
      return res.status(201).json({
        confirmacion: true,
        mensaje: 'Cuenta creada. Revisa tu correo para confirmarla y luego entra.'
      });
    }

    const conToken = clienteConToken(data.session.access_token);
    const usuario = await perfilDe(conToken, data.user.id);
    res.status(201).json(sesionPublica(data.session, usuario));
  } catch (error) {
    fallar(res, error, 400);
  }
}));

auth.post('/entrar', envolver(async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Escribe correo y contraseña' });
  }

  try {
    const supabase = clienteAnon();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return fallar(res, error, 401);

    const conToken = clienteConToken(data.session.access_token);
    const usuario = await perfilDe(conToken, data.user.id);

    res.json(sesionPublica(data.session, usuario));
  } catch (error) {
    fallar(res, error, 401);
  }
}));

auth.post('/renovar', envolver(async (req, res) => {
  const refreshToken = String(req.body?.refresh_token ?? '');
  if (!refreshToken) return res.status(400).json({ error: 'Falta la sesión' });

  try {
    const supabase = clienteAnon();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) return fallar(res, error, 401);

    const conToken = clienteConToken(data.session.access_token);
    const usuario = await perfilDe(conToken, data.user.id);

    res.json(sesionPublica(data.session, usuario));
  } catch (error) {
    fallar(res, error, 401);
  }
}));

auth.get('/yo', exigirSesion, envolver(async (req, res) => {
  try {
    const usuario = await perfilDe(req.supabase, req.usuario.id);
    res.json({ usuario });
  } catch (error) {
    fallar(res, error);
  }
}));
