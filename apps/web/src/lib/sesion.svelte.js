const LLAVE = 'mostrador_sesion';

export const sesion = $state({
  lista: false,
  token: '',
  refresh: '',
  usuario: null,
  apiUrl: 'http://localhost:3001'
});

export function iniciar(apiUrl) {
  if (sesion.lista) return;
  sesion.apiUrl = apiUrl || sesion.apiUrl;
  const guardado = sessionStorage.getItem(LLAVE);
  if (guardado) {
    try {
      const datos = JSON.parse(guardado);
      sesion.token = datos.token ?? '';
      sesion.refresh = datos.refresh ?? '';
      sesion.usuario = datos.usuario ?? null;
    } catch {
      sessionStorage.removeItem(LLAVE);
    }
  }
  sesion.lista = true;
}

export function guardar(token, usuario, refresh) {
  sesion.token = token;
  sesion.usuario = usuario;
  if (refresh) sesion.refresh = refresh;
  sessionStorage.setItem(LLAVE, JSON.stringify({
    token: sesion.token,
    refresh: sesion.refresh,
    usuario: sesion.usuario
  }));
}

export function cerrar() {
  sesion.token = '';
  sesion.refresh = '';
  sesion.usuario = null;
  sessionStorage.removeItem(LLAVE);
}
