/**
 * Type-safe DOM helpers. Use data-* selectors in templates.
 */

/** Balise native `button` — `closest()` pour ignorer clics délégués sur actions explicites. */
export const NATIVE_BUTTON_SELECTOR = 'button';

export function getElement<T extends HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T {
  const el = parent.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

export function getAllElements<T extends HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

export function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void
): () => void {
  el.addEventListener(event, handler);
  return () => el.removeEventListener(event, handler);
}
