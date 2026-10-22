import "server-only";

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import type { Commerce } from "./types";

export type { Commerce, BoiteConfig, LibelleConfig, Theme, Jetons } from "./types";

/**
 * Chargement des commerces depuis un fichier JSON hors dépôt.
 *
 * - `BOITE_COMMERCES_FICHIER` : chemin du fichier (absolu, ou relatif au dossier de lancement).
 * - Sans variable, en développement seulement : `config/commerces.local.json`, sinon
 *   `config/commerces.exemple.json`. En production, sans variable, aucun commerce n'est servi.
 *
 * Le fichier est relu quand sa date de modification change (pas besoin de redémarrer).
 */

type Cache = { fichier: string; mtime: number; commerces: Commerce[]; parHote: Map<string, Commerce> };
let cache: Cache | null = null;

function cheminFichier(): string | null {
  const env = process.env.BOITE_COMMERCES_FICHIER?.trim();
  if (env) return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env);
  if (process.env.NODE_ENV === "production") return null;
  for (const nom of ["config/commerces.local.json", "config/commerces.exemple.json"]) {
    const p = path.resolve(/*turbopackIgnore: true*/ process.cwd(), nom);
    if (existsSync(p)) return p;
  }
  return null;
}

function normaliserHote(h: string): string {
  return h.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function valider(c: unknown, i: number): Commerce {
  const o = c as Partial<Commerce>;
  const manque = (["hote", "slug", "tenantId", "nom", "domaine", "theme", "boites"] as const).filter(
    (k) => o[k] == null || o[k] === "",
  );
  if (manque.length) throw new Error(`Commerce n° ${i + 1} : champ(s) manquant(s) ${manque.join(", ")}`);
  if (!Array.isArray(o.boites) || o.boites.length === 0) throw new Error(`Commerce ${o.slug} : aucune boîte`);
  const accueils = o.boites.filter((b) => b.accueil).length;
  if (accueils !== 1) throw new Error(`Commerce ${o.slug} : il faut exactement une boîte d'accueil (trouvé ${accueils})`);
  for (const b of o.boites) {
    if (!b.adresse.toLowerCase().endsWith("@" + o.domaine!.toLowerCase())) {
      throw new Error(`Commerce ${o.slug} : l'adresse ${b.adresse} n'est pas sur le domaine ${o.domaine}`);
    }
  }
  return {
    alias: [],
    accroche: "",
    fuseau: "Pacific/Noumea",
    libelles: [],
    reponsesTypes: [],
    ...o,
  } as Commerce;
}

function charger(): Cache | null {
  const fichier = cheminFichier();
  if (!fichier) {
    if (process.env.NODE_ENV === "production") console.error("[commerces] BOITE_COMMERCES_FICHIER n'est pas défini");
    return null;
  }
  let mtime: number;
  try {
    mtime = statSync(fichier).mtimeMs;
  } catch {
    console.error("[commerces] fichier introuvable :", fichier);
    return null;
  }
  if (cache && cache.fichier === fichier && cache.mtime === mtime) return cache;

  const brut = JSON.parse(readFileSync(fichier, "utf8")) as { commerces?: unknown[] };
  const commerces = (brut.commerces ?? []).map(valider);
  const parHote = new Map<string, Commerce>();
  for (const c of commerces) {
    for (const h of [c.hote, ...(c.alias ?? [])]) {
      const n = normaliserHote(h);
      // Un hôte déclaré deux fois est une erreur de configuration : on refuse de deviner.
      if (parHote.has(n)) throw new Error(`Hôte ${n} déclaré pour deux commerces`);
      parHote.set(n, c);
    }
  }
  cache = { fichier, mtime, commerces, parHote };
  return cache;
}

/** Commerce servi pour un nom d'hôte donné, ou `null` si l'hôte est inconnu. */
export function commercePourHote(hote: string | null | undefined): Commerce | null {
  if (!hote) return null;
  const c = charger();
  return c?.parHote.get(normaliserHote(hote)) ?? null;
}

/**
 * Commerce de la requête en cours, d'après l'en-tête `host` (jamais `x-forwarded-host`,
 * que le client peut forger). Un hôte inconnu donne `null` : jamais le commerce d'un autre.
 */
export async function commerceCourant(): Promise<Commerce | null> {
  const h = await headers();
  return commercePourHote(h.get("host"));
}

/** Mode d'affichage choisi par l'utilisateur (cookie posé par l'interface). */
export const COOKIE_AFFICHAGE = "boite_affichage";
export type ModeAffichage = "clair" | "sombre" | "auto";
export function lireMode(v: string | undefined): ModeAffichage {
  return v === "clair" || v === "sombre" ? v : "auto";
}
