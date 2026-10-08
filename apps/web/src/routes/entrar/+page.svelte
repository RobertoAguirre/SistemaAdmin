<script>
  import { goto } from '$app/navigation';
  import { pedir } from '$lib/api.js';
  import { guardar } from '$lib/sesion.svelte.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let cargando = $state(false);

  async function entrar(evento) {
    evento.preventDefault();
    error = '';
    cargando = true;
    try {
      const datos = await pedir('/auth/entrar', {
        method: 'POST',
        body: { email, password }
      });
      guardar(datos.access_token, datos.usuario, datos.refresh_token);
      goto('/');
    } catch (err) {
      error = err.message;
    } finally {
      cargando = false;
    }
  }
</script>

<svelte:head>
  <title>Entrar · Mostrador</title>
</svelte:head>

<div class="grid min-h-screen place-items-center px-4">
  <form class="tarjeta w-full max-w-md p-7" onsubmit={entrar}>
    <div class="mb-6 flex items-center gap-3">
      <div class="grid h-11 w-11 place-items-center rounded-2xl bg-ink font-display text-xl text-sun">M</div>
      <div>
        <h1 class="font-display text-3xl leading-none">Mostrador</h1>
        <p class="mt-1 text-sm text-ink/60">Entra para atender el día</p>
      </div>
    </div>

    {#if error}
      <p class="aviso mb-4">{error}</p>
    {/if}

    <label class="mb-3 block text-sm">
      <span class="mb-1 block text-ink/70">Correo</span>
      <input class="campo" type="email" autocomplete="username" bind:value={email} required />
    </label>
    <label class="mb-5 block text-sm">
      <span class="mb-1 block text-ink/70">Contraseña</span>
      <input class="campo" type="password" autocomplete="current-password" bind:value={password} required />
    </label>
    <button class="btn w-full" type="submit" disabled={cargando}>
      {cargando ? 'Entrando…' : 'Entrar'}
    </button>
  </form>
</div>
