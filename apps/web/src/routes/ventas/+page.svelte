<script>
  import { pedir } from '$lib/api.js';
  import { dinero, folio, hora, hoyMexico, metodos, tickets } from '$lib/formato.js';

  let fecha = $state(hoyMexico());
  let ventas = $state([]);
  let error = $state('');
  let cargando = $state(true);

  async function cargar(dia) {
    cargando = true;
    error = '';
    try {
      const datos = await pedir(`/ventas?fecha=${dia}`);
      ventas = datos.ventas;
    } catch (err) {
      error = err.message;
    } finally {
      cargando = false;
    }
  }

  $effect(() => {
    cargar(fecha);
  });

  const total = $derived(ventas.reduce((suma, venta) => suma + venta.total, 0));
</script>

<svelte:head>
  <title>Ventas · Mostrador</title>
</svelte:head>

<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
  <div>
    <h1 class="font-display text-4xl">Ventas</h1>
    <p class="text-sm text-ink/60">{tickets(ventas.length)} · {dinero(total)}</p>
  </div>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Día</span>
    <input class="campo" type="date" bind:value={fecha} />
  </label>
</div>

{#if error}
  <p class="aviso">{error}</p>
{:else if cargando}
  <p class="text-ink/50">Cargando…</p>
{:else}
  <div class="tarjeta overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead class="bg-paper/80 text-ink/55">
        <tr>
          <th class="px-4 py-3 font-medium">Folio</th>
          <th class="px-4 py-3 font-medium">Hora</th>
          <th class="px-4 py-3 font-medium">Cliente</th>
          <th class="px-4 py-3 font-medium">Pago</th>
          <th class="px-4 py-3 font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {#each ventas as venta}
          <tr class="border-t border-line">
            <td class="px-4 py-3">
              <a class="font-medium text-brand" href="/ventas/{venta.id}">#{folio(venta.folio)}</a>
            </td>
            <td class="px-4 py-3">{hora(venta.creado_en)}</td>
            <td class="px-4 py-3">{venta.cliente ?? 'Público general'}</td>
            <td class="px-4 py-3">{metodos[venta.metodo_pago]}</td>
            <td class="px-4 py-3 font-medium">{dinero(venta.total)}</td>
          </tr>
        {:else}
          <tr>
            <td class="px-4 py-6 text-ink/50" colspan="5">No hay ventas en este día.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
