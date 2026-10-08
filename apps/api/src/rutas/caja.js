import { Router } from 'express';
import { aDinero, envolver, fallar } from '../http.js';

export const caja = Router();

function resumir(montoInicial, movimientos) {
  const suma = (tipo) => movimientos
    .filter((movimiento) => movimiento.tipo === tipo)
    .reduce((total, movimiento) => total + movimiento.monto, 0);

  const ventasEfectivo = Math.round(suma('venta') * 100) / 100;
  const entradas = Math.round(suma('entrada') * 100) / 100;
  const salidas = Math.round(suma('salida') * 100) / 100;
  const esperado = Math.round((montoInicial + ventasEfectivo + entradas - salidas) * 100) / 100;

  return { ventas_efectivo: ventasEfectivo, entradas, salidas, esperado };
}

function mapMovimiento(fila) {
  return {
    id: fila.id,
    tipo: fila.tipo,
    monto: aDinero(fila.monto),
    concepto: fila.concepto,
    creado_en: fila.creado_en
  };
}

function mapCorteCerrado(fila) {
  const esperado = aDinero(fila.monto_esperado);
  const contado = aDinero(fila.monto_contado);
  return {
    id: fila.id,
    monto_inicial: aDinero(fila.monto_inicial),
    monto_esperado: esperado,
    monto_contado: contado,
    diferencia: esperado === null || contado === null ? null : Math.round((contado - esperado) * 100) / 100,
    abierto_en: fila.abierto_en,
    cerrado_en: fila.cerrado_en
  };
}

caja.get('/', envolver(async (req, res) => {
  const { data: abierto, error: errorAbierto } = await req.supabase
    .from('cortes')
    .select('id, monto_inicial, abierto_en, perfiles (nombre)')
    .is('cerrado_en', null)
    .maybeSingle();

  if (errorAbierto) return fallar(res, errorAbierto);

  const { data: recientes, error: errorRecientes } = await req.supabase
    .from('cortes')
    .select('id, monto_inicial, monto_esperado, monto_contado, abierto_en, cerrado_en')
    .not('cerrado_en', 'is', null)
    .order('abierto_en', { ascending: false })
    .limit(8);

  if (errorRecientes) return fallar(res, errorRecientes);

  if (!abierto) {
    return res.json({
      corte: null,
      resumen: null,
      movimientos: [],
      recientes: (recientes ?? []).map(mapCorteCerrado)
    });
  }

  const { data: movimientos, error: errorMovimientos } = await req.supabase
    .from('movimientos_caja')
    .select('id, tipo, monto, concepto, creado_en')
    .eq('corte_id', abierto.id)
    .order('creado_en', { ascending: false });

  if (errorMovimientos) return fallar(res, errorMovimientos);

  const lista = (movimientos ?? []).map(mapMovimiento);
  res.json({
    corte: {
      id: abierto.id,
      monto_inicial: aDinero(abierto.monto_inicial),
      abierto_en: abierto.abierto_en,
      cajero: abierto.perfiles?.nombre ?? null
    },
    resumen: resumir(aDinero(abierto.monto_inicial), lista),
    movimientos: lista,
    recientes: (recientes ?? []).map(mapCorteCerrado)
  });
}));

caja.post('/abrir', envolver(async (req, res) => {
  const monto = Number(req.body?.monto_inicial);
  const { data, error } = await req.supabase.rpc('abrir_caja', { p_monto_inicial: monto });
  if (error) return fallar(res, error);
  res.status(201).json({ id: data });
}));

caja.post('/movimiento', envolver(async (req, res) => {
  const { data, error } = await req.supabase.rpc('movimiento_caja', {
    p_tipo: req.body?.tipo,
    p_monto: Number(req.body?.monto),
    p_concepto: req.body?.concepto ?? ''
  });
  if (error) return fallar(res, error);
  res.status(201).json({ id: data });
}));

caja.post('/cerrar', envolver(async (req, res) => {
  const { data, error } = await req.supabase.rpc('cerrar_caja', {
    p_monto_contado: Number(req.body?.monto_contado),
    p_notas: req.body?.notas ?? ''
  });
  if (error) return fallar(res, error);
  res.json({
    id: data.id,
    monto_inicial: aDinero(data.monto_inicial),
    ventas_efectivo: aDinero(data.ventas_efectivo),
    entradas: aDinero(data.entradas),
    salidas: aDinero(data.salidas),
    monto_esperado: aDinero(data.monto_esperado),
    monto_contado: aDinero(data.monto_contado),
    diferencia: aDinero(data.diferencia)
  });
}));
