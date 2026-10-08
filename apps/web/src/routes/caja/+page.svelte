<script>
  import { pedir } from '$lib/api.js';
  import { dinero, fechaHora } from '$lib/formato.js';

  let estado = $state(null);
  let error = $state('');
  let montoInicial = $state('');
  let tipo = $state('entrada');
  let monto = $state('');
  let concepto = $state('');
  let contado = $state('');
  let notas = $state('');
  let cierre = $state(null);
  let guardando = $state(false);

  const etiquetas = { venta: 'Venta', entrada: 'Entrada', salida: 'Salida' };

  async function cargar() {
    estado = await pedir('/caja');
  }

  $effect(() => {
    cargar().catch((err) => {
      error = err.message;
    });
  });

  async function abrir(evento) {
    evento.preventDefault();
    error = '';
    guardando = true;
    try {
      await pedir('/caja/abrir', { method: 'POST', body: { monto_inicial: Number(montoInicial) } });
      montoInicial = '';
      cierre = null;
      await cargar();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }

  async function movimiento(evento) {
    evento.preventDefault();
    error = '';
    guardando = true;
    try {
      await pedir('/caja/movimiento', {
        method: 'POST',
        body: { tipo, monto: Number(monto), concepto }
      });
      monto = '';
      concepto = '';
      await cargar();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }

  async function cerrarCaja(evento) {
    evento.preventDefault();
    error = '';
    guardando = true;
    try {
      cierre = await pedir('/caja/cerrar', {
        method: 'POST',
        body: { monto_contado: Number(contado), notas }
      });
      contado = '';
      notas = '';
      await cargar();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }
</script>

<svelte:head>
  <title>Caja · Mostrador</title>
</svelte:head>

<h1 class="font-display text-4xl">Caja</h1>
<p class="mb-5 text-sm text-ink/60">Un turno abierto a la vez. El efectivo esperado solo cuenta ventas en efectivo.</p>

{#if error}
  <p class="aviso mb-4">{error}</p>
{/if}

{#if cierre}
  <section class="tarjeta mb-5 p-4">
    <h2 class="font-display text-2xl">Corte listo</h2>
    <p class="mt-2 text-sm">Esperado {dinero(cierre.monto_esperado)} · Contado {dinero(cierre.monto_contado)}</p>
    <p class="text-sm {cierre.diferencia === 0 ? 'text-brand' : 'text-danger'}">
      Diferencia {dinero(cierre.diferencia)}
    </p>
  </section>
{/if}

{#if !estado}
  <p class="text-ink/50">Cargando…</p>
{:else if !estado.corte}
  <form class="tarjeta max-w-md p-4" onsubmit={abrir}>
    <h2 class="font-display text-2xl">Abrir caja</h2>
    <label class="mt-3 block text-sm">
      <span class="mb-1 block text-ink/60">Fondo inicial</span>
      <input class="campo" type="number" min="0" step="0.01" bind:value={montoInicial} required />
    </label>
    <button class="btn mt-4" type="submit" disabled={guardando}>Abrir</button>
  </form>
{:else}
  <div class="grid gap-3 sm:grid-cols-4">
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Fondo</p>
      <p class="font-display text-2xl">{dinero(estado.corte.monto_inicial)}</p>
    </article>
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Ventas en efectivo</p>
      <p class="font-display text-2xl">{dinero(estado.resumen.ventas_efectivo)}</p>
    </article>
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Entradas / salidas</p>
      <p class="font-display text-2xl">{dinero(estado.resumen.entradas - estado.resumen.salidas)}</p>
    </article>
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Esperado en cajón</p>
      <p class="font-display text-2xl">{dinero(estado.resumen.esperado)}</p>
    </article>
  </div>
  <p class="mt-2 text-sm text-ink/50">
    Abierta {fechaHora(estado.corte.abierto_en)}{estado.corte.cajero ? ` · ${estado.corte.cajero}` : ''}
  </p>

  <div class="mt-5 grid gap-5 lg:grid-cols-2">
    <form class="tarjeta p-4" onsubmit={movimiento}>
      <h2 class="font-display text-2xl">Movimiento</h2>
      <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
        <label class="rounded-xl border px-3 py-2 text-center {tipo === 'entrada' ? 'border-brand bg-brand/10' : 'border-line'}">
          <input class="sr-only" type="radio" value="entrada" bind:group={tipo} />
          Entrada
        </label>
        <label class="rounded-xl border px-3 py-2 text-center {tipo === 'salida' ? 'border-brand bg-brand/10' : 'border-line'}">
          <input class="sr-only" type="radio" value="salida" bind:group={tipo} />
          Salida
        </label>
      </div>
      <label class="mt-3 block text-sm">
        <span class="mb-1 block text-ink/60">Monto</span>
        <input class="campo" type="number" min="0.01" step="0.01" bind:value={monto} required />
      </label>
      <label class="mt-3 block text-sm">
        <span class="mb-1 block text-ink/60">Concepto</span>
        <input class="campo" bind:value={concepto} required />
      </label>
      <button class="btn mt-4" type="submit" disabled={guardando}>Registrar</button>
    </form>

    <form class="tarjeta p-4" onsubmit={cerrarCaja}>
      <h2 class="font-display text-2xl">Cerrar turno</h2>
      <label class="mt-3 block text-sm">
        <span class="mb-1 block text-ink/60">Efectivo contado</span>
        <input class="campo" type="number" min="0" step="0.01" bind:value={contado} required />
      </label>
      <label class="mt-3 block text-sm">
        <span class="mb-1 block text-ink/60">Notas</span>
        <input class="campo" bind:value={notas} />
      </label>
      <button class="btn-peligro mt-4" type="submit" disabled={guardando}>Cerrar caja</button>
    </form>
  </div>

  <section class="tarjeta mt-5 p-4">
    <h2 class="mb-2 font-display text-2xl">Movimientos del turno</h2>
    {#if estado.movimientos.length === 0}
      <p class="text-sm text-ink/50">Todavía no hay movimientos.</p>
    {:else}
      <ul class="divide-y divide-line">
        {#each estado.movimientos as movimiento}
          <li class="flex items-center justify-between py-2 text-sm">
            <span>{etiquetas[movimiento.tipo]} · {movimiento.concepto}</span>
            <span class="font-medium">{movimiento.tipo === 'salida' ? '−' : '+'}{dinero(movimiento.monto)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

{#if estado?.recientes?.length}
  <section class="mt-6">
    <h2 class="mb-2 font-display text-2xl">Cortes anteriores</h2>
    <div class="tarjeta overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="bg-paper/80 text-ink/55">
          <tr>
            <th class="px-4 py-3 font-medium">Cierre</th>
            <th class="px-4 py-3 font-medium">Esperado</th>
            <th class="px-4 py-3 font-medium">Contado</th>
            <th class="px-4 py-3 font-medium">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {#each estado.recientes as corte}
            <tr class="border-t border-line">
              <td class="px-4 py-3">{fechaHora(corte.cerrado_en)}</td>
              <td class="px-4 py-3">{dinero(corte.monto_esperado)}</td>
              <td class="px-4 py-3">{dinero(corte.monto_contado)}</td>
              <td class="px-4 py-3 {corte.diferencia === 0 ? '' : 'text-danger'}">{dinero(corte.diferencia)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
