<script>
  import { dinero, fechaHora, folio, metodos } from '$lib/formato.js';

  let { venta } = $props();
</script>

<article class="ticket-imprimible mx-auto w-full max-w-sm rounded-2xl bg-card px-5 py-6 text-ink shadow-lg">
  <header class="border-b border-dashed border-line pb-3 text-center">
    <p class="font-display text-2xl">Mostrador</p>
    <p class="mt-1 text-sm text-ink/70">Folio {folio(venta.folio)}</p>
    <p class="text-sm text-ink/60">{fechaHora(venta.creado_en)}</p>
  </header>

  <ul class="divide-y divide-dashed divide-line py-2">
    {#each venta.partidas ?? [] as partida}
      <li class="flex items-start justify-between gap-3 py-2 text-sm">
        <div>
          <p class="font-medium">{partida.nombre}</p>
          <p class="text-ink/60">{partida.cantidad} × {dinero(partida.precio)}</p>
        </div>
        <p class="font-medium">{dinero(partida.subtotal)}</p>
      </li>
    {/each}
  </ul>

  <dl class="space-y-1 border-t border-dashed border-line pt-3 text-sm">
    {#if venta.cliente}
      <div class="flex justify-between text-ink/70">
        <dt>Cliente</dt>
        <dd>{venta.cliente}</dd>
      </div>
    {/if}
    <div class="flex justify-between text-ink/70">
      <dt>Pago</dt>
      <dd>{metodos[venta.metodo_pago] ?? venta.metodo_pago}</dd>
    </div>
    <div class="flex justify-between pt-1 text-lg font-semibold">
      <dt>Total</dt>
      <dd>{dinero(venta.total)}</dd>
    </div>
    {#if venta.metodo_pago === 'efectivo'}
      <div class="flex justify-between text-ink/70">
        <dt>Recibido</dt>
        <dd>{dinero(venta.recibido)}</dd>
      </div>
      <div class="flex justify-between font-medium">
        <dt>Cambio</dt>
        <dd>{dinero(venta.cambio)}</dd>
      </div>
    {/if}
  </dl>
</article>
