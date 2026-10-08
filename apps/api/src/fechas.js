const ZONA = 'America/Mexico_City';

export function hoyMexico(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(fecha);
}

export function rangoDiaMexico(fecha) {
  const inicio = new Date(`${fecha}T00:00:00-06:00`);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}
