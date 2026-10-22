/**
 * Filet de sécurité sur le HTML des messages.
 *
 * Le nettoyage qui fait foi est celui de core_comms (amendement 2 de BOITE-ARCHITECTURE.md).
 * L'affichage ajoute deux barrières : une iframe `sandbox` sans `allow-scripts`, et une
 * politique de contenu (CSP) qui bloque les images distantes tant que l'utilisateur ne les a pas
 * demandées. Ce filet retire en plus ce qui n'a rien à faire dans un mail.
 */
export function filetHtml(html: string): string {
  return html
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*\/?\s*(script|iframe|frame|frameset|object|embed|applet|form|input|button|textarea|select|meta|link|base)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href|action)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi, '$1="#"');
}

/** Le message contient-il des ressources distantes (images, fonds, polices) ? */
export function aRessourcesDistantes(html: string): boolean {
  return /<img\b[^>]*\bsrc\s*=\s*["']?\s*(https?:)?\/\//i.test(html) || /url\(\s*["']?\s*(https?:)?\/\//i.test(html);
}
