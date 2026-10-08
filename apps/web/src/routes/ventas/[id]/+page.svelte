<script>
  import { page } from '$app/stores';
  import { pedir } from '$lib/api.js';
  import Ticket from '$lib/componentes/Ticket.svelte';

  let venta = $state(null);
  let error = $state('');

  $effect(() => {
    const id = $page.params.id;
    venta = null;
    error = '';
    pedir(`/ventas/${id}`)
      .then((datos) => {
        venta = datos;
      })
      .catch((err) => {
        error = err.message;
      });
  });
</script>

<svelte:head>
  <title>Ticket · Mostrador</title>
</svelte:head>

<a class="no-imprimir mb-4 inline-block text-sm text-brand" href="/ventas">Volver a ventas</a>

{#if error}
  <p class="aviso">{error}</p>
{:else if !venta}
  <p class="text-ink/50">Cargando ticket…</p>
{:else}
  <Ticket {venta} />
  <div class="no-imprimir mt-4 flex justify-center">
    <button class="btn-sec" type="button" onclick={() => window.print()}>Imprimir</button>
  </div>
{/if}
