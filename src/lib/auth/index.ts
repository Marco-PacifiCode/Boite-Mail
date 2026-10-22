import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Commerce } from "@/lib/commerces";
import type { Utilisateur } from "@/lib/mail/types";

/**
 * Connexion et session.
 *
 * `BOITE_AUTH` choisit la connexion : `demo` (par défaut, un bouton « Entrer » sans mot de passe)
 * ou `core-auth` (POST /api/login de core_auth, jeton gardé dans la session pour core_comms).
 * Le reste (cookie, lecture de session) ne dépend pas du mode.
 */
export function modeConnexion(): "demo" | "core-auth" {
  return process.env.BOITE_AUTH === "core-auth" ? "core-auth" : "demo";
}

/** Utilisateur de la démonstration : aucun identifiant n'est demandé ni gardé. */
export function utilisateurDemo(commerce: Commerce): Utilisateur {
  return { email: `demo@${commerce.domaine}`, nom: "Démonstration", tenantId: commerce.tenantId, boites: null };
}

export async function verifierIdentifiants(
  commerce: Commerce,
  email: string,
  motDePasse: string,
): Promise<Utilisateur | null> {
  if (!motDePasse) return null;
  const adresse = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return null;
  // En démonstration, aucun mot de passe n'est accepté : on entre par le bouton (`utilisateurDemo`),
  // pour que personne n'y tape un vrai mot de passe.
  if (modeConnexion() !== "core-auth") return null;
  return verifierChezCoreAuth(commerce, adresse, motDePasse);
}

function nomDepuisAdresse(adresse: string): string {
  const local = adresse.split("@")[0].split(/[._-]+/).filter(Boolean);
  return local.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || adresse;
}

type ReponseLogin = {
  user?: { id?: unknown; email?: unknown; role?: unknown; tenantId?: unknown };
  session?: { jwt?: unknown; maxAge?: unknown };
};

async function verifierChezCoreAuth(commerce: Commerce, adresse: string, motDePasse: string): Promise<Utilisateur | null> {
  const url = process.env.CORE_AUTH_URL;
  const cleApi = process.env.CORE_AUTH_API_KEY;
  if (!url || !cleApi) throw new Error("BOITE_AUTH=core-auth exige CORE_AUTH_URL et CORE_AUTH_API_KEY.");
  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/+$/, "")}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Core-Key": cleApi },
      body: JSON.stringify({ tenantId: commerce.tenantId, email: adresse, password: motDePasse, secure: true }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    // Jamais l'adresse, le mot de passe ni le jeton dans les journaux.
    console.error("auth.core.echec", { statut: "reseau" });
    return null;
  }
  // 401 couvre aussi « totp_requis » : la boîte ne gère pas encore la double authentification.
  if (res.status !== 200) {
    if (res.status !== 401) console.error("auth.core.echec", { statut: res.status });
    return null;
  }
  const corps = (await res.json().catch(() => null)) as ReponseLogin | null;
  const u = corps?.user;
  const jwt = corps?.session?.jwt;
  const maxAge = corps?.session?.maxAge;
  if (!u || typeof u.id !== "string" || u.tenantId !== commerce.tenantId || typeof jwt !== "string" || !jwt) return null;
  const email = typeof u.email === "string" ? u.email.toLowerCase() : adresse;
  return {
    email,
    nom: nomDepuisAdresse(email),
    tenantId: commerce.tenantId,
    boites: null,
    jeton: jwt,
    coreUserId: u.id,
    role: typeof u.role === "string" ? u.role : undefined,
    jetonExpire: typeof maxAge === "number" && maxAge > 0 ? Date.now() + maxAge * 1000 : undefined,
  };
}

// ---------------------------------------------------------------------------
// Cookie de session (signé HMAC)
// ---------------------------------------------------------------------------

export const COOKIE_SESSION = "boite_session";
const DUREE_LONGUE = 30 * 24 * 3600; // « Rester connecté » : 30 jours
const DUREE_COURTE = 12 * 3600;

const g = globalThis as unknown as { __boiteCle?: Buffer };
function cle(): Buffer {
  const env = process.env.BOITE_SESSION_CLE;
  if (env && env.length >= 32) return Buffer.from(env, "utf8");
  if (process.env.NODE_ENV === "production") throw new Error("BOITE_SESSION_CLE (32 caractères au moins) est obligatoire en production.");
  // En développement, sans clé configurée : clé aléatoire, valable le temps du processus.
  return (g.__boiteCle ??= randomBytes(32));
}

function signer(charge: string): string {
  return createHmac("sha256", cle()).update(charge).digest("base64url");
}

type Charge = Utilisateur & { exp: number };

export async function ouvrirSession(utilisateur: Utilisateur, rester: boolean): Promise<void> {
  const restant = utilisateur.jetonExpire ? Math.floor((utilisateur.jetonExpire - Date.now()) / 1000) : Infinity;
  const duree = Math.max(0, Math.min(rester ? DUREE_LONGUE : DUREE_COURTE, restant));
  const charge = Buffer.from(JSON.stringify({ ...utilisateur, exp: Date.now() + duree * 1000 } satisfies Charge)).toString(
    "base64url",
  );
  const jar = await cookies();
  jar.set(COOKIE_SESSION, `${charge}.${signer(charge)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rester ? { maxAge: duree } : {}),
  });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSION);
}

/** Utilisateur connecté pour ce commerce, ou `null`. Une session d'un autre commerce ne vaut rien ici. */
export async function lireSession(commerce: Commerce): Promise<Utilisateur | null> {
  const brut = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!brut) return null;
  const [charge, sig] = brut.split(".");
  if (!charge || !sig) return null;
  const attendu = Buffer.from(signer(charge));
  const recu = Buffer.from(sig);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  try {
    const u = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as Charge;
    if (u.exp < Date.now() || (u.jetonExpire && u.jetonExpire < Date.now()) || u.tenantId !== commerce.tenantId) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { exp, ...utilisateur } = u;
    return utilisateur;
  } catch {
    return null;
  }
}
