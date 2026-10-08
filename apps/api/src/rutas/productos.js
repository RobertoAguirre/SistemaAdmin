import { Router } from 'express';
import { aDinero, envolver, fallar } from '../http.js';

export const productos = Router();

function mapProducto(fila) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    precio: aDinero(fila.precio),
    existencia: Number(fila.existencia),
    activo: fila.activo
  };
}

function leerProducto(cuerpo, parcial) {
  const cambios = {};

  if (!parcial || Object.prototype.hasOwnProperty.call(cuerpo, 'nombre')) {
    const nombre = String(cuerpo.nombre ?? '').trim();
    if (!nombre) return { error: 'Indica el nombre' };
    cambios.nombre = nombre;
  }

  if (!parcial || Object.prototype.hasOwnProperty.call(cuerpo, 'codigo')) {
    const codigo = String(cuerpo.codigo ?? '').trim();
    cambios.codigo = codigo || null;
  }

  if (!parcial || Object.prototype.hasOwnProperty.call(cuerpo, 'precio')) {
    const precio = Number(cuerpo.precio);
    if (!Number.isFinite(precio) || precio < 0) return { error: 'Indica un precio válido' };
    cambios.precio = Math.round(precio * 100) / 100;
  }

  if (!parcial || Object.prototype.hasOwnProperty.call(cuerpo, 'existencia')) {
    const existencia = Number(cuerpo.existencia);
    if (!Number.isInteger(existencia) || existencia < 0) {
      return { error: 'La existencia debe ser un entero de cero en adelante' };
    }
    cambios.existencia = existencia;
  }

  if (Object.prototype.hasOwnProperty.call(cuerpo, 'activo')) {
    cambios.activo = Boolean(cuerpo.activo);
  }

  return { cambios };
}

productos.get('/', envolver(async (req, res) => {
  const { data, error } = await req.supabase
    .from('productos')
    .select('id, codigo, nombre, precio, existencia, activo')
    .order('nombre');

  if (error) return fallar(res, error);
  res.json((data ?? []).map(mapProducto));
}));

productos.post('/', envolver(async (req, res) => {
  const { cambios, error: validacion } = leerProducto(req.body ?? {}, false);
  if (validacion) return res.status(400).json({ error: validacion });

  const { data, error } = await req.supabase
    .from('productos')
    .insert(cambios)
    .select('id, codigo, nombre, precio, existencia, activo')
    .single();

  if (error) return fallar(res, error);
  res.status(201).json(mapProducto(data));
}));

productos.patch('/:id', envolver(async (req, res) => {
  const { cambios, error: validacion } = leerProducto(req.body ?? {}, true);
  if (validacion) return res.status(400).json({ error: validacion });
  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No hay cambios' });
  }

  const { data, error } = await req.supabase
    .from('productos')
    .update(cambios)
    .eq('id', req.params.id)
    .select('id, codigo, nombre, precio, existencia, activo')
    .single();

  if (error) return fallar(res, error);
  res.json(mapProducto(data));
}));
