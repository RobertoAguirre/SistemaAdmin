<script>
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { cerrar, iniciar, sesion } from '$lib/sesion.svelte.js';

  let { children } = $props();

  const enlaces = [
    { href: '/', etiqueta: 'Mostrador' },
    { href: '/tablero', etiqueta: 'Tablero' },
    { href: '/productos', etiqueta: 'Productos' },
    { href: '/clientes', etiqueta: 'Clientes' },
    { href: '/ventas', etiqueta: 'Ventas' },
    { href: '/caja', etiqueta: 'Caja' }
  ];

  $effect(() => {
    iniciar();
  });

  $effect(() => {
    if (!sesion.lista) return;
    const ruta = $page.url.pathname;
    if (!sesion.token && ruta !== '/entrar') goto('/entrar');
    if (sesion.token && ruta === '/entrar') goto('/');
  });

  function activa(href, ruta) {
    if (href === '/') return ruta === '/';
    return ruta === href || ruta.startsWith(`${href}/`);
  }

  function salir() {
    cerrar();
    goto('/entrar');
  }
</script>

{#if !sesion.lista}
  <div class="grid min-h-screen place-items-center text-ink/60">Cargando…</div>
{:else if $page.url.pathname === '/entrar'}
  {@render children()}
{:else if sesion.token}
  <div class="min-h-screen md:grid md:grid-cols-[230px_1fr]">
    <aside class="no-imprimir bg-ink text-paper md:min-h-screen">
      <div class="flex items-center gap-3 px-4 py-4">
        <div class="grid h-9 w-9 place-items-center rounded-xl bg-sun font-display text-lg text-ink">M</div>
        <div>
          <p class="font-display text-xl leading-none">Mostrador</p>
          <p class="mt-1 text-xs text-paper/60">Negocio de mostrador</p>
        </div>
      </div>
      <nav class="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
        {#each enlaces as enlace}
          <a
            href={enlace.href}
            class="rounded-xl px-3 py-2 text-sm whitespace-nowrap {activa(enlace.href, $page.url.pathname)
              ? 'bg-white/15 text-white'
              : 'text-paper/75 hover:bg-white/10 hover:text-white'}"
          >
            {enlace.etiqueta}
          </a>
        {/each}
      </nav>
      <div class="hidden items-center justify-between gap-3 border-t border-white/10 px-4 py-4 md:flex">
        <div class="min-w-0">
          <p class="truncate text-sm">{sesion.usuario?.nombre ?? 'Cajero'}</p>
          <p class="text-xs text-paper/50 capitalize">{sesion.usuario?.rol ?? ''}</p>
        </div>
        <button class="text-sm text-paper/70 hover:text-white" type="button" onclick={salir}>Salir</button>
      </div>
    </aside>
    <div class="min-w-0">
      <div class="no-imprimir flex items-center justify-end border-b border-line px-4 py-2 md:hidden">
        <span class="mr-3 text-sm">{sesion.usuario?.nombre ?? 'Cajero'}</span>
        <button class="text-sm text-brand" type="button" onclick={salir}>Salir</button>
      </div>
      <main class="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-7">
        {@render children()}
      </main>
    </div>
  </div>
{:else}
  <div class="grid min-h-screen place-items-center text-ink/60">Cargando…</div>
{/if}
