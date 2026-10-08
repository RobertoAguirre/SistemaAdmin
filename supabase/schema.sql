-- Esquema de Mostrador para Supabase.
-- Pégalo en el editor SQL del proyecto y ejecútalo una sola vez.
-- Después crea el primer usuario en Authentication (con auto-confirmación).
-- El trigger crea su perfil. Si el usuario ya existía, al entrar se crea solo.

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol text not null default 'cajero' check (rol in ('admin', 'cajero')),
  creado_en timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nombre text not null,
  precio numeric(12, 2) not null check (precio >= 0),
  existencia integer not null default 0 check (existencia >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint productos_codigo_unico unique (codigo)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  notas text,
  creado_en timestamptz not null default now()
);

create table public.cortes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id),
  monto_inicial numeric(12, 2) not null check (monto_inicial >= 0),
  monto_esperado numeric(12, 2),
  monto_contado numeric(12, 2),
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  notas text
);

create unique index cortes_uno_abierto
  on public.cortes ((true))
  where cerrado_en is null;

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  folio bigint generated always as identity,
  cliente_id uuid references public.clientes (id) on delete set null,
  usuario_id uuid not null references public.perfiles (id),
  corte_id uuid not null references public.cortes (id),
  metodo_pago text not null check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia')),
  total numeric(12, 2) not null check (total >= 0),
  recibido numeric(12, 2),
  cambio numeric(12, 2),
  creado_en timestamptz not null default now()
);

create table public.venta_partidas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas (id) on delete cascade,
  producto_id uuid references public.productos (id) on delete set null,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio numeric(12, 2) not null check (precio >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create table public.movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid not null references public.cortes (id),
  usuario_id uuid not null references public.perfiles (id),
  venta_id uuid references public.ventas (id),
  tipo text not null check (tipo in ('entrada', 'salida', 'venta')),
  monto numeric(12, 2) not null check (monto > 0),
  concepto text not null,
  creado_en timestamptz not null default now()
);

create index ventas_creado_en_idx on public.ventas (creado_en desc);
create index ventas_corte_idx on public.ventas (corte_id);
create index partidas_venta_idx on public.venta_partidas (venta_id);
create index movimientos_corte_idx on public.movimientos_caja (corte_id);
create index productos_nombre_idx on public.productos (nombre);

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row
  execute function public.crear_perfil();

create or replace function public.asegurar_perfil()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  insert into public.perfiles (id, nombre)
  select id, coalesce(nullif(split_part(email, '@', 1), ''), 'Cajero')
  from auth.users
  where id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

create or replace function public.abrir_caja(p_monto_inicial numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  perform public.asegurar_perfil();

  if p_monto_inicial is null or p_monto_inicial < 0 then
    raise exception 'Indica un monto inicial válido';
  end if;

  if exists (select 1 from public.cortes where cerrado_en is null) then
    raise exception 'Ya hay una caja abierta';
  end if;

  begin
    insert into public.cortes (usuario_id, monto_inicial)
    values (auth.uid(), round(p_monto_inicial, 2))
    returning id into v_id;
  exception
    when unique_violation then
      raise exception 'Ya hay una caja abierta';
  end;

  return v_id;
end;
$$;

create or replace function public.movimiento_caja(
  p_tipo text,
  p_monto numeric,
  p_concepto text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corte uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  if p_tipo not in ('entrada', 'salida') then
    raise exception 'Tipo de movimiento no válido';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'Indica un monto mayor a cero';
  end if;

  if coalesce(trim(p_concepto), '') = '' then
    raise exception 'Indica el concepto';
  end if;

  select id into v_corte
  from public.cortes
  where cerrado_en is null
  limit 1;

  if v_corte is null then
    raise exception 'No hay una caja abierta';
  end if;

  insert into public.movimientos_caja (corte_id, usuario_id, tipo, monto, concepto)
  values (v_corte, auth.uid(), p_tipo, round(p_monto, 2), trim(p_concepto))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cerrar_caja(p_monto_contado numeric, p_notas text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corte uuid;
  v_inicial numeric(12, 2);
  v_ventas numeric(12, 2);
  v_entradas numeric(12, 2);
  v_salidas numeric(12, 2);
  v_esperado numeric(12, 2);
  v_contado numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  if p_monto_contado is null or p_monto_contado < 0 then
    raise exception 'Indica el efectivo contado';
  end if;

  select id, monto_inicial into v_corte, v_inicial
  from public.cortes
  where cerrado_en is null
  for update;

  if v_corte is null then
    raise exception 'No hay una caja abierta';
  end if;

  select
    coalesce(sum(monto) filter (where tipo = 'venta'), 0),
    coalesce(sum(monto) filter (where tipo = 'entrada'), 0),
    coalesce(sum(monto) filter (where tipo = 'salida'), 0)
  into v_ventas, v_entradas, v_salidas
  from public.movimientos_caja
  where corte_id = v_corte;

  v_esperado := round(v_inicial + v_ventas + v_entradas - v_salidas, 2);
  v_contado := round(p_monto_contado, 2);

  update public.cortes
  set cerrado_en = now(),
      monto_esperado = v_esperado,
      monto_contado = v_contado,
      notas = nullif(trim(coalesce(p_notas, '')), '')
  where id = v_corte;

  return jsonb_build_object(
    'id', v_corte,
    'monto_inicial', v_inicial,
    'ventas_efectivo', v_ventas,
    'entradas', v_entradas,
    'salidas', v_salidas,
    'monto_esperado', v_esperado,
    'monto_contado', v_contado,
    'diferencia', v_contado - v_esperado
  );
end;
$$;

create or replace function public.registrar_venta(
  p_cliente_id uuid,
  p_metodo_pago text,
  p_recibido numeric,
  p_partidas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_corte uuid;
  v_venta uuid;
  v_folio bigint;
  v_total numeric(12, 2) := 0;
  v_cambio numeric(12, 2) := 0;
  v_recibido numeric(12, 2);
  v_item jsonb;
  v_producto public.productos%rowtype;
  v_cantidad integer;
  v_subtotal numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  perform public.asegurar_perfil();

  if p_metodo_pago not in ('efectivo', 'tarjeta', 'transferencia') then
    raise exception 'Método de pago no válido';
  end if;

  if p_partidas is null or jsonb_typeof(p_partidas) <> 'array' or jsonb_array_length(p_partidas) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  if p_cliente_id is not null and not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'Cliente no encontrado';
  end if;

  select id into v_corte
  from public.cortes
  where cerrado_en is null
  order by abierto_en desc
  limit 1
  for update;

  if v_corte is null then
    raise exception 'Abre la caja antes de cobrar';
  end if;

  insert into public.ventas (cliente_id, usuario_id, corte_id, metodo_pago, total)
  values (p_cliente_id, auth.uid(), v_corte, p_metodo_pago, 0)
  returning id, folio into v_venta, v_folio;

  for v_item in select value from jsonb_array_elements(p_partidas)
  loop
    if coalesce(v_item ->> 'cantidad', '') !~ '^[0-9]+$' then
      raise exception 'Cantidad no válida';
    end if;

    v_cantidad := (v_item ->> 'cantidad')::integer;
    if v_cantidad < 1 then
      raise exception 'Cantidad no válida';
    end if;

    select * into v_producto
    from public.productos
    where id = (v_item ->> 'producto_id')::uuid
    for update;

    if not found or not v_producto.activo then
      raise exception 'Hay un producto que ya no está disponible';
    end if;

    if v_producto.existencia < v_cantidad then
      raise exception 'Sin existencia suficiente de %', v_producto.nombre;
    end if;

    v_subtotal := round(v_producto.precio * v_cantidad, 2);
    v_total := v_total + v_subtotal;

    update public.productos
    set existencia = existencia - v_cantidad
    where id = v_producto.id;

    insert into public.venta_partidas (venta_id, producto_id, nombre, cantidad, precio, subtotal)
    values (v_venta, v_producto.id, v_producto.nombre, v_cantidad, v_producto.precio, v_subtotal);
  end loop;

  if p_metodo_pago = 'efectivo' then
    v_recibido := round(coalesce(p_recibido, 0), 2);
    if v_recibido < v_total then
      raise exception 'El efectivo recibido no cubre el total';
    end if;
    v_cambio := round(v_recibido - v_total, 2);
  else
    v_recibido := null;
    v_cambio := 0;
  end if;

  update public.ventas
  set total = v_total,
      recibido = v_recibido,
      cambio = v_cambio
  where id = v_venta;

  if p_metodo_pago = 'efectivo' and v_total > 0 then
    insert into public.movimientos_caja (corte_id, usuario_id, venta_id, tipo, monto, concepto)
    values (v_corte, auth.uid(), v_venta, 'venta', v_total, 'Venta ' || lpad(v_folio::text, 4, '0'));
  end if;

  return jsonb_build_object(
    'id', v_venta,
    'folio', v_folio,
    'total', v_total,
    'cambio', v_cambio,
    'recibido', v_recibido,
    'metodo_pago', p_metodo_pago
  );
exception
  when invalid_text_representation then
    raise exception 'Hay un producto no válido';
end;
$$;

revoke all on function public.crear_perfil() from public, anon, authenticated;
grant execute on function public.crear_perfil() to supabase_auth_admin;
revoke all on function public.asegurar_perfil() from public, anon;
revoke all on function public.abrir_caja(numeric) from public, anon;
revoke all on function public.movimiento_caja(text, numeric, text) from public, anon;
revoke all on function public.cerrar_caja(numeric, text) from public, anon;
revoke all on function public.registrar_venta(uuid, text, numeric, jsonb) from public, anon;

grant execute on function public.asegurar_perfil() to authenticated;
grant execute on function public.abrir_caja(numeric) to authenticated;
grant execute on function public.movimiento_caja(text, numeric, text) to authenticated;
grant execute on function public.cerrar_caja(numeric, text) to authenticated;
grant execute on function public.registrar_venta(uuid, text, numeric, jsonb) to authenticated;

revoke all on all tables in schema public from anon;
grant select on public.perfiles to authenticated;
grant update (nombre) on public.perfiles to authenticated;
grant select, insert, update, delete on public.productos to authenticated;
grant select, insert, update, delete on public.clientes to authenticated;
grant select on public.ventas to authenticated;
grant select on public.venta_partidas to authenticated;
grant select on public.cortes to authenticated;
grant select on public.movimientos_caja to authenticated;

alter table public.perfiles enable row level security;
alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.venta_partidas enable row level security;
alter table public.cortes enable row level security;
alter table public.movimientos_caja enable row level security;

create policy perfiles_lectura on public.perfiles
  for select to authenticated using (true);

create policy perfiles_nombre on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy productos_auth on public.productos
  for all to authenticated using (true) with check (true);

create policy clientes_auth on public.clientes
  for all to authenticated using (true) with check (true);

create policy ventas_lectura on public.ventas
  for select to authenticated using (true);

create policy partidas_lectura on public.venta_partidas
  for select to authenticated using (true);

create policy cortes_lectura on public.cortes
  for select to authenticated using (true);

create policy movimientos_lectura on public.movimientos_caja
  for select to authenticated using (true);

-- Para dejar al primer usuario como administrador, después de crearlo:
-- update public.perfiles set rol = 'admin', nombre = 'Tu nombre' where id = 'UUID_DEL_USUARIO';
