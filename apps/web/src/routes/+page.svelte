<script>
  import { pedir } from '$lib/api.js';
  import Ticket from '$lib/componentes/Ticket.svelte';
  import { dinero } from '$lib/formato.js';

  let productos = $state([]);
  let clientes = $state([]);
  let cajaAbierta = $state(true);
  let busca = $state('');
  let carrito = $state([]);
  let clienteId = $state('');
  let metodo = $state('efectivo');
  let recibido = $state('');
  let error = $state('');
  let cargando = $state(false);
  let ticket = $state(null);

  const visibles = $derived.by(() => {
    const q = busca.trim().toLowerCase();
    return productos.filter((producto) => {
      if (!producto.activo) return false;
      if (!q) return true;
      return producto.nombre.toLowerCase().includes(q) || (producto.codigo ?? '').toLowerCase().includes(q);
    });
  });

  const total = $derived(carrito.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0));
  const cambio = $derived(Math.max(0, Number(recibido || 0) - total));
  const puedeCobrar = $derived(
    carrito.length > 0 &&
      !cargando &&
      cajaAbierta &&
      (metodo !== 'efectivo' || Number(recibido) >= total)
  );

  async function cargar() {
    const [listaProductos, listaClientes, estadoCaja] = await Promise.all([
      pedir('/productos'),
      pedir('/clientes'),
      pedir('/caja')
    ]);
    productos = listaProductos;
    clientes = listaClientes;
    cajaAbierta = Boolean(estadoCaja.corte);
  }

  $effect(() => {
    cargar().catch((err) => {
      error = err.message;
    });
  });

  function agregar(producto) {
    if (producto.existencia < 1) return;
    const linea = carrito.find((item) => item.id === producto.id);
    if (linea) {
      if (linea.cantidad >= producto.existencia) return;
      linea.cantidad += 1;
    } else {
      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        existencia: producto.existencia,
        cantidad: 1
      });
    }
  }

  function cambiar(id, delta) {
    const linea = carrito.find((item) => item.id === id);
    if (!linea) return;
    const siguiente = linea.cantidad + delta;
    if (siguiente <= 0) {
      carrito = carrito.filter((item) => item.id !== id);
      return;
    }
    if (siguiente > linea.existencia) return;
    linea.cantidad = siguiente;
  }

  function alBuscar(evento) {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const q = busca.trim().toLowerCase();
    const exacto = productos.find((producto) => (producto.codigo ?? '').toLowerCase() === q && producto.activo);
    if (exacto) {
      agregar(exacto);
      busca = '';
    }
  }

  async function cobrar(evento) {
    evento.preventDefault();
    error = '';
    cargando = true;
    try {
      const creada = await pedir('/ventas', {
        method: 'POST',
        body: {
          cliente_id: clienteId || null,
          metodo_pago: metodo,
          recibido: metodo === 'efectivo' ? Number(recibido) : null,
          partidas: carrito.map((linea) => ({
            producto_id: linea.id,
            cantidad: linea.cantidad
          }))
        }
      });
      ticket = await pedir(`/ventas/${creada.id}`);
      carrito = [];
      recibido = '';
      clienteId = '';
      await cargar();
    } catch (err) {
      error = err.message;
      await cargar().catch(() => {});
    } finally {
      cargando = false;
    }
  }

  function nuevaVenta() {
    ticket = null;
  }
</script>

<svelte:head>
  <title>Mostrador</title>
</svelte:head>

<div class="no-imprimir mb-5 flex items-end justify-between gap-3">
  <div>
    <h1 class="font-display text-4xl">Mostrador</h1>
    <p class="text-sm text-ink/60">Busca por nombre o código y arma el ticket.</p>
  </div>
</div>

{#if !cajaAbierta}
  <p class="aviso no-imprimir mb-4">La caja está cerrada. <a class="underline" href="/caja">Ábrela</a> antes de cobrar.</p>
{/if}
{#if error}
  <p class="aviso no-imprimir mb-4">{error}</p>
{/if}

<div class="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
  <section class="no-imprimir">
    <input
      class="campo mb-4"
      placeholder="Nombre o código, Enter para agregar"
      bind:value={busca}
      onkeydown={alBuscar}
    />
    {#if visibles.length === 0}
      <p class="text-sm text-ink/50">No hay productos con esa búsqueda.</p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {#each visibles as producto}
          <button
            type="button"
            class="tarjeta p-4 text-left disabled:opacity-50"
            disabled={producto.existencia < 1}
            onclick={() => agregar(producto)}
          >
            <p class="font-medium">{producto.nombre}</p>
            {#if producto.codigo}
              <p class="text-xs text-ink/45">{producto.codigo}</p>
            {/if}
            <div class="mt-3 flex items-end justify-between">
              <p class="font-display text-xl">{dinero(producto.precio)}</p>
              <p class="text-xs {producto.existencia === 0 ? 'text-danger' : 'text-ink/50'}">
                {producto.existencia === 0 ? 'Agotado' : `${producto.existencia} pzas`}
              </p>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <form class="tarjeta no-imprimir sticky top-4 p-4" onsubmit={cobrar}>
    <h2 class="font-display text-2xl">Ticket</h2>
    <label class="mt-3 block text-sm">
      <span class="mb-1 block text-ink/60">Cliente</span>
      <select class="campo" bind:value={clienteId}>
        <option value="">Público general</option>
        {#each clientes as cliente}
          <option value={cliente.id}>{cliente.nombre}</option>
        {/each}
      </select>
    </label>

    <ul class="my-4 max-h-72 space-y-3 overflow-auto">
      {#if carrito.length === 0}
        <li class="text-sm text-ink/50">Todavía no hay productos.</li>
      {/if}
      {#each carrito as linea}
        <li class="flex items-center justify-between gap-2 text-sm">
          <div>
            <p class="font-medium">{linea.nombre}</p>
            <p class="text-ink/55">{dinero(linea.precio)}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-sec px-2 py-1" type="button" onclick={() => cambiar(linea.id, -1)}>−</button>
            <span class="w-5 text-center">{linea.cantidad}</span>
            <button class="btn-sec px-2 py-1" type="button" onclick={() => cambiar(linea.id, 1)}>+</button>
          </div>
        </li>
      {/each}
    </ul>

    <p class="flex items-center justify-between border-t border-line pt-3 font-display text-2xl">
      <span>Total</span>
      <span>{dinero(total)}</span>
    </p>

    <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
      {#each ['efectivo', 'tarjeta', 'transferencia'] as opcion}
        <label class="rounded-xl border px-2 py-2 text-center {metodo === opcion ? 'border-brand bg-brand/10' : 'border-line'}">
          <input class="sr-only" type="radio" name="metodo" value={opcion} bind:group={metodo} />
          {opcion === 'efectivo' ? 'Efectivo' : opcion === 'tarjeta' ? 'Tarjeta' : 'Transf.'}
        </label>
      {/each}
    </div>

    {#if metodo === 'efectivo'}
      <label class="mt-3 block text-sm">
        <span class="mb-1 block text-ink/60">Efectivo recibido</span>
        <input class="campo" type="number" min="0" step="0.01" bind:value={recibido} />
      </label>
      <p class="mt-2 text-sm text-ink/70">Cambio {dinero(cambio)}</p>
    {/if}

    <button class="btn mt-4 w-full" type="submit" disabled={!puedeCobrar}>
      {cargando ? 'Cobrando…' : 'Cobrar'}
    </button>
  </form>
</div>

{#if ticket}
  <div class="fondo-modal fixed inset-0 z-20 grid place-items-center bg-ink/40 p-4">
    <div>
      <Ticket venta={ticket} />
      <div class="no-imprimir mt-4 flex justify-center gap-2">
        <button class="btn-sec" type="button" onclick={() => window.print()}>Imprimir</button>
        <button class="btn" type="button" onclick={nuevaVenta}>Nueva venta</button>
      </div>
    </div>
  </div>
{/if}
