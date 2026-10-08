import { Router } from 'express';
import { hoyMexico, rangoDiaMexico } from '../fechas.js';
import { aDinero, envolver, fallar } from '../http.js';

export const ventas = Router();
const metodos = ['efectivo', 'tarjeta', 'transferencia'];

function mapPartida(fila) {
  return {
    nombre: fila.nombre,
    cantidad: Number(fila.cantidad),
    precio: aDinero(fila.precio),
    subtotal: aDinero(fila.subtotal)
  };
}

function mapVenta(fila, conPartidas) {
  const venta = {
    id: fila.id,
    folio: Number(fila.folio),
    metodo_pago: fila.metodo_pago,
    total: aDinero(fila.total),
    recibido: aDinero(fila.recibido),
    cambio: aDinero(fila.cambio),
    creado_en: fila.creado_en,
    cliente: fila.clientes?.nombre ?? null,
    cajero: fila.perfiles?.nombre ?? null
  };
  if (conPartidas) venta.partidas = (fila.venta_partidas ?? []).map(mapPartida);
  return venta;
}

const seleccionLista = `
  id, folio, metodo_pago, total, recibido, cambio, creado_en,
  clientes (nombre),
  perfiles (nombre)
`;

const seleccionDetalle = `
  ${seleccionLista},
  venta_partidas (nombre, cantidad, precio, subtotal)
`;

ventas.get('/', envolver(async (req, res) => {
  const fecha = String(req.query.fecha || hoyMexico());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: 'Fecha no válida' });
  }
  const rango = rangoDiaMexico(fecha);
  if (!rango) return res.status(400).json({ error: 'Fecha no válida' });

  const { data, error } = await req.supabase
    .from('ventas')
    .select(seleccionLista)
    .gte('creado_en', rango.inicio)
    .lt('creado_en', rango.fin)
    .order('creado_en', { ascending: false });

  if (error) return fallar(res, error);
  res.json({ fecha, ventas: (data ?? []).map((fila) => mapVenta(fila, false)) });
}));

ventas.get('/:id', envolver(async (req, res) => {
  const { data, error } = await req.supabase
    .from('ventas')
    .select(seleccionDetalle)
    .eq('id', req.params.id)
    .single();

  if (error) return fallar(res, error);
  res.json(mapVenta(data, true));
}));

ventas.post('/', envolver(async (req, res) => {
  const metodo = String(req.body?.metodo_pago ?? '');
  if (!metodos.includes(metodo)) {
    return res.status(400).json({ error: 'Método de pago no válido' });
  }

  const partidas = Array.isArray(req.body?.partidas) ? req.body.partidas : [];
  if (partidas.length === 0) return res.status(400).json({ error: 'Agrega al menos un producto' });

  const limpias = partidas.map((partida) => ({
    producto_id: partida.producto_id,
    cantidad: Number(partida.cantidad)
  }));

  const recibido = req.body?.recibido === null || req.body?.recibido === undefined || req.body?.recibido === ''
    ? null
    : Number(req.body.recibido);

  const { data, error } = await req.supabase.rpc('registrar_venta', {
    p_cliente_id: req.body?.cliente_id || null,
    p_metodo_pago: metodo,
    p_recibido: recibido,
    p_partidas: limpias
  });

  if (error) return fallar(res, error);
  res.status(201).json({
    id: data.id,
    folio: Number(data.folio),
    total: aDinero(data.total),
    cambio: aDinero(data.cambio),
    recibido: aDinero(data.recibido),
    metodo_pago: data.metodo_pago
  });
}));
