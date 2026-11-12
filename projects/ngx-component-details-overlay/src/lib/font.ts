/** Google Fonts stylesheet for Lato, the overlay's default font. */
export const LATO_URL = 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap';

const LINK_ATTRIBUTE = 'data-cdo-font';

/**
 * Adds a stylesheet link for Lato, once. Skips the request if the page already links Lato
 * from Google Fonts. Does nothing outside a browser.
 */
export function ensureLatoFont() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[${LINK_ATTRIBUTE}]`)) return;
  if (document.querySelector('link[href*="fonts.googleapis.com"][href*="family=Lato"]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = LATO_URL;
  link.setAttribute(LINK_ATTRIBUTE, '');
  document.head.appendChild(link);
}
