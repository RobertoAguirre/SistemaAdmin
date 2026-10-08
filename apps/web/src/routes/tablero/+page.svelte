<script>
  import { pedir } from '$lib/api.js';
  import { dinero, folio, hora, metodos, tickets } from '$lib/formato.js';

  let datos = $state(null);
  let error = $state('');

  $effect(() => {
    pedir('/tablero')
      .then((respuesta) => {
        datos = respuesta;
      })
      .catch((err) => {
        error = err.message;
      });
  });
</script>

<svelte:head>
  <title>Tablero · Mostrador</title>
</svelte:head>

<h1 class="font-display text-4xl">Hoy</h1>
<p class="mb-5 text-sm text-ink/60">Resumen del día en horario de Ciudad de México.</p>

{#if error}
  <p class="aviso">{error}</p>
{:else if !datos}
  <p class="text-ink/50">Cargando…</p>
{:else}
  <div class="grid gap-3 sm:grid-cols-3">
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Ventas</p>
      <p class="font-display text-3xl">{dinero(datos.total)}</p>
      <p class="text-sm text-ink/55">{tickets(datos.tickets)}</p>
    </article>
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Ticket promedio</p>
      <p class="font-display text-3xl">{dinero(datos.promedio)}</p>
    </article>
    <article class="tarjeta p-4">
      <p class="text-sm text-ink/55">Efectivo en caja</p>
      <p class="font-display text-3xl">
        {datos.caja_abierta ? dinero(datos.efectivo_esperado) : 'Cerrada'}
      </p>
    </article>
  </div>

  <div class="mt-6 grid gap-5 lg:grid-cols-2">
    <section class="tarjeta p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-display text-2xl">Últimas ventas</h2>
        <a class="text-sm text-brand" href="/ventas">Ver el día</a>
      </div>
      {#if datos.ventas.length === 0}
        <p class="text-sm text-ink/50">Aún no hay ventas hoy.</p>
      {:else}
        <ul class="divide-y divide-line">
          {#each datos.ventas as venta}
            <li>
              <a class="flex items-center justify-between py-2 text-sm" href="/ventas/{venta.id}">
                <span>#{folio(venta.folio)} · {hora(venta.creado_en)} · {metodos[venta.metodo_pago]}</span>
                <span class="font-medium">{dinero(venta.total)}</span>
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="tarjeta p-4">
      <h2 class="mb-3 font-display text-2xl">Existencia baja</h2>
      {#if datos.bajos.length === 0}
        <p class="text-sm text-ink/50">Ningún producto activo tiene 5 piezas o menos.</p>
      {:else}
        <ul class="divide-y divide-line">
          {#each datos.bajos as producto}
            <li class="flex items-center justify-between py-2 text-sm">
              <span>{producto.nombre}</span>
              <span class="{producto.existencia === 0 ? 'text-danger' : ''}">{producto.existencia} pzas</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </div>
{/if}
