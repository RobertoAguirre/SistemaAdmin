import { Router } from 'express';
import { envolver, fallar } from '../http.js';

export const clientes = Router();

function mapCliente(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    telefono: fila.telefono,
    notas: fila.notas
  };
}

function leerCliente(cuerpo) {
  const nombre = String(cuerpo.nombre ?? '').trim();
  if (!nombre) return { error: 'Indica el nombre' };
  const telefono = String(cuerpo.telefono ?? '').trim();
  const notas = String(cuerpo.notas ?? '').trim();
  return {
    cambios: {
      nombre,
      telefono: telefono || null,
      notas: notas || null
    }
  };
}

clientes.get('/', envolver(async (req, res) => {
  const { data, error } = await req.supabase
    .from('clientes')
    .select('id, nombre, telefono, notas')
    .order('nombre');

  if (error) return fallar(res, error);
  res.json((data ?? []).map(mapCliente));
}));

clientes.post('/', envolver(async (req, res) => {
  const { cambios, error: validacion } = leerCliente(req.body ?? {});
  if (validacion) return res.status(400).json({ error: validacion });

  const { data, error } = await req.supabase.from('clientes').insert(cambios).select('id, nombre, telefono, notas').single();
  if (error) return fallar(res, error);
  res.status(201).json(mapCliente(data));
}));

clientes.patch('/:id', envolver(async (req, res) => {
  const { cambios, error: validacion } = leerCliente(req.body ?? {});
  if (validacion) return res.status(400).json({ error: validacion });

  const { data, error } = await req.supabase
    .from('clientes')
    .update(cambios)
    .eq('id', req.params.id)
    .select('id, nombre, telefono, notas')
    .single();

  if (error) return fallar(res, error);
  res.json(mapCliente(data));
}));

clientes.delete('/:id', envolver(async (req, res) => {
  const { error } = await req.supabase.from('clientes').delete().eq('id', req.params.id);
  if (error) return fallar(res, error);
  res.json({ ok: true });
}));
