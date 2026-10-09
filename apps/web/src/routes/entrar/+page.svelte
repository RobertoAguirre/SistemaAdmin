<script>
  import { goto } from '$app/navigation';
  import { pedir } from '$lib/api.js';
  import { guardar } from '$lib/sesion.svelte.js';

  let registro = $state(false);
  let nombre = $state('');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let aviso = $state('');
  let cargando = $state(false);

  function cambiarModo() {
    registro = !registro;
    error = '';
    aviso = '';
  }

  async function enviar(evento) {
    evento.preventDefault();
    error = '';
    aviso = '';
    cargando = true;
    try {
      const ruta = registro ? '/auth/registro' : '/auth/entrar';
      const datos = await pedir(ruta, {
        method: 'POST',
        body: registro ? { nombre, email, password } : { email, password }
      });
      if (datos.confirmacion) {
        aviso = datos.mensaje;
        registro = false;
        password = '';
        return;
      }
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
  <title>{registro ? 'Crear cuenta' : 'Entrar'} · Mostrador</title>
</svelte:head>

<div class="grid min-h-screen place-items-center px-4">
  <form class="tarjeta w-full max-w-md p-7" onsubmit={enviar}>
    <div class="mb-6 flex items-center gap-3">
      <div class="grid h-11 w-11 place-items-center rounded-2xl bg-ink font-display text-xl text-sun">M</div>
      <div>
        <h1 class="font-display text-3xl leading-none">Mostrador</h1>
        <p class="mt-1 text-sm text-ink/60">
          {registro ? 'Crea tu acceso para el mostrador' : 'Entra para atender el día'}
        </p>
      </div>
    </div>

    {#if error}
      <p class="aviso mb-4">{error}</p>
    {/if}
    {#if aviso}
      <p class="mb-4 rounded-xl bg-brand/10 px-3 py-2 text-sm text-brand">{aviso}</p>
    {/if}

    {#if registro}
      <label class="mb-3 block text-sm">
        <span class="mb-1 block text-ink/70">Nombre</span>
        <input class="campo" autocomplete="name" bind:value={nombre} required />
      </label>
    {/if}
    <label class="mb-3 block text-sm">
      <span class="mb-1 block text-ink/70">Correo</span>
      <input class="campo" type="email" autocomplete="username" bind:value={email} required />
    </label>
    <label class="mb-5 block text-sm">
      <span class="mb-1 block text-ink/70">Contraseña</span>
      <input
        class="campo"
        type="password"
        minlength={registro ? 6 : undefined}
        autocomplete={registro ? 'new-password' : 'current-password'}
        bind:value={password}
        required
      />
    </label>
    <button class="btn w-full" type="submit" disabled={cargando}>
      {#if cargando}
        {registro ? 'Creando cuenta…' : 'Entrando…'}
      {:else}
        {registro ? 'Crear cuenta' : 'Entrar'}
      {/if}
    </button>
    <button class="mt-4 w-full text-sm text-brand" type="button" onclick={cambiarModo}>
      {registro ? 'Ya tengo cuenta' : 'Registrar un usuario nuevo'}
    </button>
  </form>
</div>
