/**
 * Modo demo por ruta.
 *
 * O mock (lib/demo-data.ts) só é usado quando o navegador está numa ruta
 * de demonstração: /demo ou /demo/*. Em qualquer outra ruta a app fala
 * com a API real.
 */

/** prefijo com o qual vive o modo demo: /demo e /demo/*. */
export const DEMO_PREFIX = "/demo";

/** true quando o navegador está numa ruta de demo (/demo ou /demo/*). */
export function isDemoRoute(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname } = window.location;
  return pathname === DEMO_PREFIX || pathname.startsWith(`${DEMO_PREFIX}/`);
}

/**
 * Devolve o href interno do dashboard adaptado ao modo demo:
 * se estamos navegando em /demo/*, os enlaces a /dashboard/* são
 * reescritos a /demo/* para não saír da demo. Nas demais rutas
 * devolve o href tal qual.
 */
export function routeHref(href: string): string {
  if (!isDemoRoute()) return href;
  if (href === "/dashboard") return DEMO_PREFIX;
  if (href.startsWith("/dashboard/")) {
    return DEMO_PREFIX + href.slice("/dashboard".length);
  }
  return href;
}