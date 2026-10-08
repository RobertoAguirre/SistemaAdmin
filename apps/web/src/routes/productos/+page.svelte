<script>
  import { pedir } from '$lib/api.js';
  import { dinero } from '$lib/formato.js';

  let productos = $state([]);
  let editando = $state(null);
  let nombre = $state('');
  let codigo = $state('');
  let precio = $state('');
  let existencia = $state(0);
  let error = $state('');
  let guardando = $state(false);

  async function cargar() {
    productos = await pedir('/productos');
  }

  $effect(() => {
    cargar().catch((err) => {
      error = err.message;
    });
  });

  function limpiar() {
    editando = null;
    nombre = '';
    codigo = '';
    precio = '';
    existencia = 0;
  }

  function editar(producto) {
    editando = producto.id;
    nombre = producto.nombre;
    codigo = producto.codigo ?? '';
    precio = producto.precio;
    existencia = producto.existencia;
  }

  async function guardar(evento) {
    evento.preventDefault();
    error = '';
    guardando = true;
    const cuerpo = { nombre, codigo, precio: Number(precio), existencia: Number(existencia) };
    try {
      if (editando) {
        await pedir(`/productos/${editando}`, { method: 'PATCH', body: cuerpo });
      } else {
        await pedir('/productos', { method: 'POST', body: cuerpo });
      }
      limpiar();
      await cargar();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }

  async function cambiarActivo(producto) {
    error = '';
    try {
      await pedir(`/productos/${producto.id}`, {
        method: 'PATCH',
        body: { activo: !producto.activo }
      });
      await cargar();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<svelte:head>
  <title>Productos · Mostrador</title>
</svelte:head>

<h1 class="font-display text-4xl">Productos</h1>
<p class="mb-5 text-sm text-ink/60">Precio de venta y piezas en el anaquel.</p>

{#if error}
  <p class="aviso mb-4">{error}</p>
{/if}

<form class="tarjeta mb-5 grid gap-3 p-4 md:grid-cols-6" onsubmit={guardar}>
  <label class="text-sm md:col-span-2">
    <span class="mb-1 block text-ink/60">Nombre</span>
    <input class="campo" bind:value={nombre} required />
  </label>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Código</span>
    <input class="campo" bind:value={codigo} />
  </label>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Precio</span>
    <input class="campo" type="number" min="0" step="0.01" bind:value={precio} required />
  </label>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Existencia</span>
    <input class="campo" type="number" min="0" step="1" bind:value={existencia} required />
  </label>
  <div class="flex items-end gap-2">
    <button class="btn w-full" type="submit" disabled={guardando}>
      {editando ? 'Guardar' : 'Agregar'}
    </button>
    {#if editando}
      <button class="btn-sec" type="button" onclick={limpiar}>Cancelar</button>
    {/if}
  </div>
</form>

<div class="tarjeta overflow-x-auto">
  <table class="w-full text-left text-sm">
    <thead class="bg-paper/80 text-ink/55">
      <tr>
        <th class="px-4 py-3 font-medium">Producto</th>
        <th class="px-4 py-3 font-medium">Precio</th>
        <th class="px-4 py-3 font-medium">Existencia</th>
        <th class="px-4 py-3 font-medium"></th>
      </tr>
    </thead>
    <tbody>
      {#each productos as producto}
        <tr class="border-t border-line {producto.activo ? '' : 'opacity-50'}">
          <td class="px-4 py-3">
            <p class="font-medium">{producto.nombre}</p>
            {#if producto.codigo}<p class="text-xs text-ink/45">{producto.codigo}</p>{/if}
          </td>
          <td class="px-4 py-3">{dinero(producto.precio)}</td>
          <td class="px-4 py-3">{producto.existencia}</td>
          <td class="px-4 py-3 text-right">
            <button class="btn-sec mr-2 px-3 py-1.5" type="button" onclick={() => editar(producto)}>Editar</button>
            <button class="btn-sec px-3 py-1.5" type="button" onclick={() => cambiarActivo(producto)}>
              {producto.activo ? 'Ocultar' : 'Activar'}
            </button>
          </td>
        </tr>
      {:else}
        <tr>
          <td class="px-4 py-6 text-ink/50" colspan="4">Agrega el primer producto.</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
