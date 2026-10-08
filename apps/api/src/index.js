import './env.js';
import cors from 'cors';
import express from 'express';
import { exigirSesion } from './http.js';
import { auth } from './rutas/auth.js';
import { caja } from './rutas/caja.js';
import { clientes } from './rutas/clientes.js';
import { productos } from './rutas/productos.js';
import { tablero } from './rutas/tablero.js';
import { ventas } from './rutas/ventas.js';

const origenes = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: origenes }));
app.use(express.json());

app.get('/salud', (_req, res) => {
  res.json({ ok: true, servicio: 'mostrador-api' });
});

app.use('/auth', auth);
app.use('/productos', exigirSesion, productos);
app.use('/clientes', exigirSesion, clientes);
app.use('/ventas', exigirSesion, ventas);
app.use('/caja', exigirSesion, caja);
app.use('/tablero', exigirSesion, tablero);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno' : error.message
  });
});

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('Faltan SUPABASE_URL o SUPABASE_ANON_KEY. La API arranca, pero las rutas de datos fallarán.');
}

const puerto = Number(process.env.PORT) || 3001;
app.listen(puerto, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${puerto}`);
});
