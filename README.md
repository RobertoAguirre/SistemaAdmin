# Mostrador

Administración de un negocio pequeño con mostrador: punto de venta, productos, clientes, ventas y caja.

Monorepo con npm workspaces:

- `apps/api` — API en Node.js (Express). Habla con Supabase usando la sesión de cada usuario.
- `apps/web` — interfaz en SvelteKit y Tailwind.
- `supabase/schema.sql` — tablas, reglas y funciones para pegar en Supabase.
- `render.yaml` — Blueprint con los dos servicios web.

La zona horaria de los reportes es `America/Mexico_City`. Los importes son en pesos mexicanos.

## Requisitos

- Node.js 22 o superior
- Un proyecto de [Supabase](https://supabase.com)

## Base de datos

1. Crea un proyecto en Supabase.
2. Abre el editor SQL y ejecuta `supabase/schema.sql` completo.
3. En Authentication, crea el primer usuario con **Auto Confirm** activado.
4. El trigger crea su perfil como cajero. El rol queda guardado para identificar al dueño; cajero y administrador operan el mismo mostrador. Si quieres marcarlo como administrador:

```sql
update public.perfiles
set rol = 'admin', nombre = 'Tu nombre'
where id = 'UUID_DEL_USUARIO';
```

Las ventas, el inventario y la caja se registran en funciones de Postgres para que el cobro y el stock queden en una sola transacción. La API usa la llave `anon` y el token del usuario; las políticas RLS impiden leer datos sin sesión.

En Authentication puedes subir la expiración del JWT (por ejemplo 8 horas). Si vence durante el turno, la interfaz renueva la sesión sola.

## Desarrollo local

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
npm run dev
```

- Interfaz: http://localhost:5173
- API: http://localhost:3001/salud

Llena `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `apps/api/.env` con los valores de Project Settings → API. No uses la llave `service_role` en esta aplicación.

## Publicar en Render

1. Sube este repositorio a GitHub o GitLab.
2. En Render: **New → Blueprint** y selecciona el repo. Render lee `render.yaml`.
3. Al sincronizar, captura `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
4. El servicio web recibe `API_URL` desde la API, y la API recibe `CORS_ORIGIN` desde la web.

Quedan dos servicios:

| Servicio        | Comando de arranque                          |
|-----------------|-----------------------------------------------|
| `mostrador-api` | `npm run start -w @mostrador/api`            |
| `mostrador-web` | `npm run start -w @mostrador/web`            |

El plan del Blueprint es `free`. Cámbialo a `starter` en `render.yaml` si no quieres que el servicio se duerma.

## Uso del día

1. Entra con el usuario de Supabase.
2. Abre la caja con el fondo en efectivo.
3. Cobra en Mostrador. El precio se toma de la base, no del navegador, y se descuenta la existencia.
4. Tarjeta y transferencia no entran al cajón. El corte compara el efectivo esperado contra lo contado.
5. Cierra la caja al terminar el turno.
