import { browser } from '$app/environment';

/**
 * Link-hover prefetching for remote queries.
 *
 * SvelteKit's `data-sveltekit-preload-data` only preloads the code and `load` functions for a
 * route. Remote queries are called inside components, which aren't rendered during a preload, so
 * their data is never fetched early. This helper fills that gap: when the user hovers (or touches /
 * focuses) a link, we start the route's queries and keep them "in use" briefly so the component
 * that mounts after navigation shares the same in-flight / cached query instead of refetching.
 */

type PrefetchableQuery = PromiseLike<unknown> & { readonly current?: unknown };

export type PrefetchRoute = {
  /** Matched against `url.pathname` */
  pattern: RegExp;
  /** Return the queries (with the same arguments the page uses) to start fetching */
  queries: (match: RegExpExecArray) => PrefetchableQuery[];
};

/** How long a prefetched query is kept alive waiting for the page to claim it */
const HOLD_MS = 15_000;
/** Pointer must rest on a link this long before we prefetch (avoids fetching on fly-bys) */
const HOVER_DELAY_MS = 60;

const held = new Map<string, () => void>();

function prefetch(url: URL, routes: PrefetchRoute[]) {
  const key = url.pathname;
  if (held.has(key)) return;

  for (const route of routes) {
    const match = route.pattern.exec(url.pathname);
    if (!match) continue;

    let queries: PrefetchableQuery[];
    try {
      queries = route.queries(match);
    } catch {
      return;
    }
    if (queries.length === 0) return;

    // Prevent unhandled rejections (e.g. 403 for routes the user can't access)
    for (const q of queries) q.then(undefined, () => {});

    // Reading `.current` in an effect keeps the query in active use and triggers the fetch
    const dispose = $effect.root(() => {
      $effect(() => {
        for (const q of queries) {
          try {
            void q.current;
          } catch {
            // errored queries are surfaced by the page itself
          }
        }
      });
    });

    const timer = setTimeout(() => {
      dispose();
      held.delete(key);
    }, HOLD_MS);
    held.set(key, () => {
      clearTimeout(timer);
      dispose();
    });
    return;
  }
}

function linkFromEvent(event: Event): HTMLAnchorElement | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const a = target.closest('a[href]');
  if (!(a instanceof HTMLAnchorElement)) return null;
  if (a.target === '_blank' || a.hasAttribute('download')) return null;
  if (a.getAttribute('rel')?.split(/\s+/).includes('external')) return null;
  if (a.closest('[data-sveltekit-preload-data="false"]')) return null;
  if (a.closest('[data-sveltekit-reload]')) return null;
  return a;
}

/**
 * Start listening for link hover / touch / focus. Call once from the root layout and return the
 * cleanup function from `onMount`.
 */
export function initLinkPrefetch(routes: PrefetchRoute[]): () => void {
  if (!browser) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (event: Event, delay: number) => {
    clearTimeout(timer);
    // Respect "Data Saver"
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    const a = linkFromEvent(event);
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;

    timer = setTimeout(() => prefetch(url, routes), delay);
  };

  const onOver = (e: Event) => schedule(e, HOVER_DELAY_MS);
  const onTouch = (e: Event) => schedule(e, 0);
  const onOut = () => clearTimeout(timer);

  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  document.addEventListener('touchstart', onTouch, { passive: true });
  document.addEventListener('focusin', onTouch, { passive: true });

  return () => {
    clearTimeout(timer);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('touchstart', onTouch);
    document.removeEventListener('focusin', onTouch);
    for (const release of held.values()) release();
    held.clear();
  };
}
