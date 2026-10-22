import { Fraunces, Inter, Manrope, Playfair_Display, Poppins } from "next/font/google";
import type { ClePolice } from "@/lib/commerces/types";

/**
 * Polices proposées aux thèmes. Elles sont auto-hébergées par next/font (aucun appel à Google
 * depuis le navigateur) et non préchargées : le navigateur ne télécharge que celles que le thème
 * de l'hôte utilise réellement.
 */
const manrope = Manrope({ subsets: ["latin"], variable: "--police-manrope", preload: false, display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--police-inter", preload: false, display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--police-poppins",
  preload: false,
  display: "swap",
});
const fraunces = Fraunces({ subsets: ["latin"], variable: "--police-fraunces", preload: false, display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--police-playfair-display",
  preload: false,
  display: "swap",
});

export const classesPolices = [manrope, inter, poppins, fraunces, playfair].map((p) => p.variable).join(" ");

const REPLI: Record<ClePolice, string> = {
  manrope: "system-ui, sans-serif",
  inter: "system-ui, sans-serif",
  poppins: "system-ui, sans-serif",
  fraunces: "Georgia, serif",
  "playfair-display": "Georgia, serif",
};

const CONNUES = new Set<string>(Object.keys(REPLI));

export function pilePolice(cle: string | undefined, defaut: ClePolice): string {
  const k = (cle && CONNUES.has(cle) ? cle : defaut) as ClePolice;
  return `var(--police-${k}), ${REPLI[k]}`;
}
