import type { Commerce, Jetons, TeinteLibelle } from "./types";

/**
 * Jetons neutres, repris de la maquette (Main.dc.html, `tokens()`).
 * Un commerce ne surcharge que ce qui le distingue (accent, sélection, fond…).
 *
 * Contrastes calculés (WCAG 2.x, luminance relative) pour les jetons neutres :
 * - clair : texte / surface 17,1:1 ; atténué / relevé 5,9:1 ; bordure forte / surface ≥ 3:1.
 * - sombre : texte / surface 14,3:1 ; atténué / relevé 6,3:1 ; bordure forte / saisie ≥ 3:1.
 * Les thèmes des commerces se vérifient avec les mêmes paires (texte 4,5:1, contours 3:1).
 */
export const JETONS_CLAIRS: Jetons = {
  fond: "#F4F2F3",
  surface: "#FFFFFF",
  releve: "#F6F3F2",
  saisie: "#F6F3F2",
  texte: "#1E1B1D",
  attenue: "#625C61",
  bordure: "#E7E1E3",
  bordureForte: "#8C8389",
  accent: "#4A4448",
  surAccent: "#FFFFFF",
  encreAccent: "#4A4448",
  selection: "#EEEAEC",
  etoile: "#B07800",
  toastFond: "#1E1B1D",
  toastTexte: "#FFFFFF",
  toastAction: "#FFFFFF",
  iaFond: "#F7F5F6",
  depotFond: "rgba(255, 255, 255, 0.94)",
  alerteFond: "#FFF3DC",
  alerteTexte: "#6B4500",
  voile: "rgba(20, 14, 20, 0.38)",
  balayageArchiver: "#1F6B43",
  balayageSupprimer: "#B42318",
  surBalayage: "#FFFFFF",
  anneau: "#1E1B1D",
  panneauFond: "#4A4448",
  panneauTexte: "#FFFFFF",
};

export const JETONS_SOMBRES: Jetons = {
  fond: "#121114",
  surface: "#1C1B20",
  releve: "#26252B",
  saisie: "#26252B",
  texte: "#EDEAEE",
  attenue: "#ABA5AE",
  bordure: "#2E2C33",
  bordureForte: "#7D7785",
  accent: "#D9D4DB",
  surAccent: "#141215",
  encreAccent: "#D9D4DB",
  selection: "#2E2C33",
  etoile: "#F2C14E",
  toastFond: "#EDEAEE",
  toastTexte: "#141215",
  toastAction: "#141215",
  iaFond: "#18171B",
  depotFond: "rgba(28, 27, 32, 0.92)",
  alerteFond: "#3A2A12",
  alerteTexte: "#F2C98A",
  voile: "rgba(0, 0, 0, 0.6)",
  balayageArchiver: "#1F6B43",
  balayageSupprimer: "#B42318",
  surBalayage: "#FFFFFF",
  anneau: "#EDEAEE",
  panneauFond: "#26252B",
  panneauTexte: "#EDEAEE",
};

/** Puces de libellé, reprises de la maquette (`chips()`), texte ≥ 6:1 sur leur fond. */
export const TEINTES: Record<TeinteLibelle, { clair: [string, string]; sombre: [string, string] }> = {
  bleu: { clair: ["#E6EEF9", "#24508F"], sombre: ["#1F2C40", "#9DBDF0"] },
  violet: { clair: ["#EEE8F7", "#5B3F8C"], sombre: ["#2B2340", "#C3AEEB"] },
  orange: { clair: ["#FBEBDD", "#8A4510"], sombre: ["#3A2718", "#F0B47E"] },
  vert: { clair: ["#E3F1E8", "#22663D"], sombre: ["#1C3326", "#8FD3A8"] },
  jaune: { clair: ["#FFF1D2", "#6E4E00"], sombre: ["#3A3016", "#EBCB7A"] },
  rose: { clair: ["#F9E4EC", "#8C2A52"], sombre: ["#3D2230", "#F2A9C6"] },
};

const VAR: Record<keyof Jetons, string> = {
  fond: "--fond",
  surface: "--surface",
  releve: "--releve",
  saisie: "--saisie",
  texte: "--texte",
  attenue: "--attenue",
  bordure: "--bordure",
  bordureForte: "--bordure-forte",
  accent: "--accent",
  surAccent: "--sur-accent",
  encreAccent: "--encre-accent",
  selection: "--selection",
  etoile: "--etoile",
  toastFond: "--toast-fond",
  toastTexte: "--toast-texte",
  toastAction: "--toast-action",
  iaFond: "--ia-fond",
  depotFond: "--depot-fond",
  alerteFond: "--alerte-fond",
  alerteTexte: "--alerte-texte",
  voile: "--voile",
  balayageArchiver: "--balayage-archiver",
  balayageSupprimer: "--balayage-supprimer",
  surBalayage: "--sur-balayage",
  anneau: "--anneau",
  panneauFond: "--panneau-fond",
  panneauTexte: "--panneau-texte",
};

/** N'accepte qu'une couleur CSS simple : la valeur finit dans une feuille de style. */
const COULEUR = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/;

export function couleurSure(v: unknown, repli: string): string {
  return typeof v === "string" && COULEUR.test(v.trim()) ? v.trim() : repli;
}

export function jetonsComplets(commerce: Commerce | null, mode: "clair" | "sombre"): Jetons {
  const base = mode === "clair" ? JETONS_CLAIRS : JETONS_SOMBRES;
  const sur = commerce ? commerce.theme[mode] : {};
  const out = { ...base };
  (Object.keys(base) as (keyof Jetons)[]).forEach((k) => {
    out[k] = couleurSure(sur[k], base[k]);
  });
  return out;
}

function bloc(j: Jetons): string {
  return (Object.keys(VAR) as (keyof Jetons)[]).map((k) => `${VAR[k]}:${j[k]};`).join("");
}

/** Avatars des correspondants (maquette, `avatar()`), texte ≥ 6:1 sur son fond. */
const AVATARS = {
  clair: [["#F3E3D3", "#6E4219"], ["#DCEAF0", "#1F4F60"], ["#E8E0F3", "#4C3672"], ["#E0EDDD", "#2B5727"], ["#F5DFE3", "#80293A"], ["#E7E5DE", "#4A4536"]],
  sombre: [["#3A2C20", "#EBC59F"], ["#1E333A", "#A2D2E2"], ["#2D2541", "#CBB8EF"], ["#21331E", "#AAD9A3"], ["#3D2228", "#F2ACB7"], ["#302E28", "#D6CFBA"]],
} as const;

function blocTeintes(mode: "clair" | "sombre"): string {
  return AVATARS[mode].map(([f, t], i) => `--avatar-${i}-fond:${f};--avatar-${i}-texte:${t};`).join("") + (Object.keys(TEINTES) as TeinteLibelle[])
    .map((t) => `--puce-${t}-fond:${TEINTES[t][mode][0]};--puce-${t}-texte:${TEINTES[t][mode][1]};`)
    .join("");
}

/**
 * Feuille de style du thème. Le mode est porté par `data-mode` sur <html> :
 * `clair`, `sombre`, ou `auto` (suit le système).
 */
export function feuilleTheme(commerce: Commerce | null): string {
  const c = bloc(jetonsComplets(commerce, "clair")) + blocTeintes("clair") + "color-scheme:light;";
  const s = bloc(jetonsComplets(commerce, "sombre")) + blocTeintes("sombre") + "color-scheme:dark;";
  return (
    `:root{${c}}` +
    `:root[data-mode="sombre"]{${s}}` +
    `@media (prefers-color-scheme: dark){:root[data-mode="auto"]{${s}}}`
  );
}
