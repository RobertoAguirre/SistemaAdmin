import { Router } from 'express';
import { hoyMexico, rangoDiaMexico } from '../fechas.js';
import { aDinero, envolver, fallar } from '../http.js';

export const tablero = Router();

tablero.get('/', envolver(async (req, res) => {
  const fecha = hoyMexico();
  const rango = rangoDiaMexico(fecha);

  const ventasQuery = req.supabase
    .from('ventas')
    .select('id, folio, total, metodo_pago, creado_en')
    .gte('creado_en', rango.inicio)
    .lt('creado_en', rango.fin)
    .order('creado_en', { ascending: false });

  const bajosQuery = req.supabase
    .from('productos')
    .select('id, nombre, existencia')
    .eq('activo', true)
    .lte('existencia', 5)
    .order('existencia');

  const cajaQuery = req.supabase
    .from('cortes')
    .select('id, monto_inicial')
    .is('cerrado_en', null)
    .maybeSingle();

  const [ventasRes, bajosRes, cajaRes] = await Promise.all([ventasQuery, bajosQuery, cajaQuery]);
  if (ventasRes.error) return fallar(res, ventasRes.error);
  if (bajosRes.error) return fallar(res, bajosRes.error);
  if (cajaRes.error) return fallar(res, cajaRes.error);

  const ventas = (ventasRes.data ?? []).map((fila) => ({
    id: fila.id,
    folio: Number(fila.folio),
    total: aDinero(fila.total),
    metodo_pago: fila.metodo_pago,
    creado_en: fila.creado_en
  }));

  const total = Math.round(ventas.reduce((suma, venta) => suma + venta.total, 0) * 100) / 100;

  let efectivo = null;
  if (cajaRes.data) {
    const { data: movimientos, error } = await req.supabase
      .from('movimientos_caja')
      .select('tipo, monto')
      .eq('corte_id', cajaRes.data.id);
    if (error) return fallar(res, error);

    const suma = (tipo) => (movimientos ?? [])
      .filter((movimiento) => movimiento.tipo === tipo)
      .reduce((acumulado, movimiento) => acumulado + Number(movimiento.monto), 0);

    const inicial = aDinero(cajaRes.data.monto_inicial);
    efectivo = Math.round((inicial + suma('venta') + suma('entrada') - suma('salida')) * 100) / 100;
  }

  res.json({
    fecha,
    tickets: ventas.length,
    total,
    promedio: ventas.length ? Math.round((total / ventas.length) * 100) / 100 : 0,
    ventas: ventas.slice(0, 6),
    bajos: bajosRes.data ?? [],
    caja_abierta: Boolean(cajaRes.data),
    efectivo_esperado: efectivo
  });
}));
