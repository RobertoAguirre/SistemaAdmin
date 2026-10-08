const dineroMx = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const fechaMx = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Mexico_City'
});

const horaMx = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Mexico_City'
});

export const metodos = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
};

export function dinero(valor) {
  return dineroMx.format(Number(valor) || 0);
}

export function fechaHora(valor) {
  if (!valor) return '';
  return fechaMx.format(new Date(valor));
}

export function hora(valor) {
  if (!valor) return '';
  return horaMx.format(new Date(valor));
}

export function folio(valor) {
  return String(valor ?? '').padStart(4, '0');
}

export function tickets(cantidad) {
  return cantidad === 1 ? '1 ticket' : `${cantidad} tickets`;
}

export function hoyMexico() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
