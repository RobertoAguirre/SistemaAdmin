import { clienteConToken } from './supabase.js';

export function envolver(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function aDinero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return null;
  return Math.round(numero * 100) / 100;
}

export function mensajeError(error) {
  const texto = error?.message || 'Error de base de datos';
  if (texto === 'Invalid login credentials') return 'Correo o contraseña incorrectos';
  if (texto === 'Email not confirmed') {
    return 'Confirma el correo antes de entrar. Revisa tu bandeja.';
  }
  if (texto === 'User already registered') return 'Ese correo ya está registrado';
  if (texto.startsWith('Password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  return texto.replace(/^P0001:\s*/, '');
}

export function fallar(res, error, status = 400) {
  if (error?.code === 'PGRST116') {
    return res.status(404).json({ error: 'No se encontró el registro' });
  }
  if (error?.code === '23505') {
    const texto = error.message?.includes('codigo')
      ? 'Ese código ya existe'
      : 'Ese registro ya existe';
    return res.status(409).json({ error: texto });
  }
  const statusFinal = error?.status || status;
  return res.status(statusFinal).json({ error: mensajeError(error) });
}

export async function exigirSesion(req, res, next) {
  try {
    const encabezado = req.headers.authorization ?? '';
    const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Sesión requerida' });

    const supabase = clienteConToken(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida' });

    req.usuario = data.user;
    req.supabase = supabase;
    next();
  } catch (error) {
    next(error);
  }
}
