import { env } from '$env/dynamic/private';

async function reenviar({ request, params, url }) {
  const base = (env.API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
  const destino = new URL(`${base}/${params.ruta ?? ''}`);
  destino.search = url.search;

  const headers = new Headers();
  const tipo = request.headers.get('content-type');
  const autorizacion = request.headers.get('authorization');
  if (tipo) headers.set('content-type', tipo);
  if (autorizacion) headers.set('authorization', autorizacion);

  try {
    const respuesta = await fetch(destino, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text()
    });
    return new Response(await respuesta.text(), {
      status: respuesta.status,
      headers: { 'content-type': respuesta.headers.get('content-type') || 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'No hay conexión con el servidor' }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }
}

export const GET = reenviar;
export const POST = reenviar;
export const PATCH = reenviar;
export const PUT = reenviar;
export const DELETE = reenviar;
