<script>
  import { pedir } from '$lib/api.js';

  let clientes = $state([]);
  let editando = $state(null);
  let nombre = $state('');
  let telefono = $state('');
  let notas = $state('');
  let error = $state('');
  let guardando = $state(false);

  async function cargar() {
    clientes = await pedir('/clientes');
  }

  $effect(() => {
    cargar().catch((err) => {
      error = err.message;
    });
  });

  function limpiar() {
    editando = null;
    nombre = '';
    telefono = '';
    notas = '';
  }

  function editar(cliente) {
    editando = cliente.id;
    nombre = cliente.nombre;
    telefono = cliente.telefono ?? '';
    notas = cliente.notas ?? '';
  }

  async function guardar(evento) {
    evento.preventDefault();
    error = '';
    guardando = true;
    const cuerpo = { nombre, telefono, notas };
    try {
      if (editando) {
        await pedir(`/clientes/${editando}`, { method: 'PATCH', body: cuerpo });
      } else {
        await pedir('/clientes', { method: 'POST', body: cuerpo });
      }
      limpiar();
      await cargar();
    } catch (err) {
      error = err.message;
    } finally {
      guardando = false;
    }
  }

  async function quitar(cliente) {
    if (!confirm(`¿Quitar a ${cliente.nombre}? Las ventas conservan el folio.`)) return;
    error = '';
    try {
      await pedir(`/clientes/${cliente.id}`, { method: 'DELETE' });
      if (editando === cliente.id) limpiar();
      await cargar();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<svelte:head>
  <title>Clientes · Mostrador</title>
</svelte:head>

<h1 class="font-display text-4xl">Clientes</h1>
<p class="mb-5 text-sm text-ink/60">Opcional en el ticket. Público general no necesita ficha.</p>

{#if error}
  <p class="aviso mb-4">{error}</p>
{/if}

<form class="tarjeta mb-5 grid gap-3 p-4 md:grid-cols-4" onsubmit={guardar}>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Nombre</span>
    <input class="campo" bind:value={nombre} required />
  </label>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Teléfono</span>
    <input class="campo" bind:value={telefono} />
  </label>
  <label class="text-sm">
    <span class="mb-1 block text-ink/60">Notas</span>
    <input class="campo" bind:value={notas} />
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
        <th class="px-4 py-3 font-medium">Nombre</th>
        <th class="px-4 py-3 font-medium">Teléfono</th>
        <th class="px-4 py-3 font-medium">Notas</th>
        <th class="px-4 py-3"></th>
      </tr>
    </thead>
    <tbody>
      {#each clientes as cliente}
        <tr class="border-t border-line">
          <td class="px-4 py-3 font-medium">{cliente.nombre}</td>
          <td class="px-4 py-3">{cliente.telefono ?? '—'}</td>
          <td class="px-4 py-3 text-ink/70">{cliente.notas ?? '—'}</td>
          <td class="px-4 py-3 text-right">
            <button class="btn-sec mr-2 px-3 py-1.5" type="button" onclick={() => editar(cliente)}>Editar</button>
            <button class="btn-peligro px-3 py-1.5" type="button" onclick={() => quitar(cliente)}>Quitar</button>
          </td>
        </tr>
      {:else}
        <tr>
          <td class="px-4 py-6 text-ink/50" colspan="4">Todavía no hay clientes.</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
