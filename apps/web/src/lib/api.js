import { cerrar, guardar, sesion } from './sesion.svelte.js';

export async function pedir(ruta, opciones = {}, reintento = true) {
  let respuesta;
  try {
    respuesta = await fetch(`/backend${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(sesion.token ? { Authorization: `Bearer ${sesion.token}` } : {})
      },
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body)
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }

  if (respuesta.status === 401 && reintento && sesion.refresh && ruta !== '/auth/renovar') {
    const renovado = await fetch('/backend/auth/renovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sesion.refresh })
    });
    if (renovado.ok) {
      const datos = await renovado.json();
      guardar(datos.access_token, datos.usuario, datos.refresh_token);
      return pedir(ruta, opciones, false);
    }
    cerrar();
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || 'No se pudo completar la operación');
  }
  return datos;
}
