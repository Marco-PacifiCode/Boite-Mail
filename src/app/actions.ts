"use server";

import { redirect } from "next/navigation";
import { fermerSession, lireSession, modeConnexion, ouvrirSession, utilisateurDemo, verifierIdentifiants } from "@/lib/auth";
import { commerceCourant } from "@/lib/commerces";
import { mailApi } from "@/lib/mail";
import type {
  Dossier,
  EtatBoites,
  FiltreListe,
  ModeReecriture,
  ModificationConversation,
  PageConversations,
  Parametres,
  PieceAEnvoyer,
  ResumeConversation,
  ResumeIA,
  Conversation,
  Vue,
} from "@/lib/mail/types";

/**
 * Server actions de la boîte. Les composants clients ne parlent qu'à elles : jamais
 * directement à la couche de données. Chaque action retrouve le commerce par l'hôte et
 * l'utilisateur par la session, et refuse si l'un des deux manque.
 */

async function contexte() {
  const commerce = await commerceCourant();
  if (!commerce) throw new Error("Boîte introuvable");
  const utilisateur = await lireSession(commerce);
  if (!utilisateur) throw new Error("Session expirée : reconnectez-vous.");
  return { commerce, utilisateur, api: mailApi(commerce, utilisateur) };
}

const DOSSIERS: Dossier[] = ["suivis", "envoyes", "brouillons", "archives", "indesirables", "corbeille"];

function vueSure(v: unknown): Vue {
  const o = (v ?? {}) as { type?: string; id?: unknown };
  if (o.type === "aTrier") return { type: "aTrier" };
  if (o.type === "boite" && typeof o.id === "string") return { type: "boite", id: o.id };
  if (o.type === "libelle" && typeof o.id === "string") return { type: "libelle", id: o.id };
  if (o.type === "dossier" && DOSSIERS.includes(o.id as Dossier)) return { type: "dossier", id: o.id as Dossier };
  throw new Error("Vue inconnue");
}

function modificationSure(m: unknown): ModificationConversation {
  const o = (m ?? {}) as Record<string, unknown>;
  const out: ModificationConversation = {};
  if (typeof o.boiteId === "string") out.boiteId = o.boiteId;
  if (Array.isArray(o.libelles)) out.libelles = o.libelles.filter((x): x is string => typeof x === "string");
  for (const k of ["lu", "archive", "indesirable", "suivi", "supprime"] as const) {
    if (typeof o[k] === "boolean") out[k] = o[k] as boolean;
  }
  return out;
}

// --- Connexion ---

export async function seConnecter(
  email: string,
  motDePasse: string,
  rester = false,
): Promise<{ erreur: string } | { ok: true }> {
  const commerce = await commerceCourant();
  if (!commerce) return { erreur: "Aucune messagerie n’est ouverte à cette adresse." };
  if (!String(email ?? "").trim() || !String(motDePasse ?? "")) {
    return { erreur: "Saisissez votre adresse et votre mot de passe." };
  }
  const utilisateur = await verifierIdentifiants(commerce, String(email), String(motDePasse));
  if (!utilisateur) return { erreur: "Adresse ou mot de passe incorrect." };
  await ouvrirSession(utilisateur, !!rester);
  // Pas de redirect("/") ici : le formulaire recharge la page en entier, sinon la mise en page
  // racine (et la feuille de thème du commerce) n'est pas rendue à neuf après la connexion.
  return { ok: true };
}

/** Entrée dans la démonstration, sans identifiant (`BOITE_AUTH=demo` seulement). */
export async function entrerDemo(): Promise<{ erreur: string } | { ok: true }> {
  const commerce = await commerceCourant();
  if (!commerce) return { erreur: "Aucune messagerie n’est ouverte à cette adresse." };
  if (modeConnexion() !== "demo") return { erreur: "La démonstration n’est pas ouverte ici." };
  await ouvrirSession(utilisateurDemo(commerce), false);
  return { ok: true };
}

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/connexion");
}

// --- Boîtes et conversations ---

export async function chargerEtat(): Promise<EtatBoites> {
  const { api } = await contexte();
  return api.listerBoites();
}

export async function chargerListe(filtre: FiltreListe): Promise<PageConversations> {
  const { api } = await contexte();
  return api.listerConversations({
    vue: vueSure(filtre?.vue),
    q: typeof filtre?.q === "string" ? filtre.q.slice(0, 200) : undefined,
    curseur: typeof filtre?.curseur === "string" ? filtre.curseur : undefined,
  });
}

/** Ouvre une conversation : la lit, la marque comme lue, et rend le résumé IA. */
export async function ouvrirConversation(
  id: string,
): Promise<{ conversation: Conversation; ia: ResumeIA | null; etat: EtatBoites }> {
  const { api } = await contexte();
  const lue = await api.lireConversation(String(id));
  if (!lue.lu) await api.modifierConversation(lue.id, { lu: true });
  const params = await api.lireParametres();
  const [conversation, ia, etat] = await Promise.all([
    api.lireConversation(lue.id),
    params.ia.resumes ? api.resumerConversation(lue.id) : Promise.resolve(null),
    api.listerBoites(),
  ]);
  return { conversation, ia, etat };
}

export async function modifierConversations(
  ids: string[],
  modification: ModificationConversation,
): Promise<{ resumes: ResumeConversation[]; etat: EtatBoites }> {
  const { api } = await contexte();
  const mod = modificationSure(modification);
  const resumes: ResumeConversation[] = [];
  for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) {
    resumes.push(await api.modifierConversation(String(id), mod));
  }
  return { resumes, etat: await api.listerBoites() };
}

async function piecesDuFormulaire(fd: FormData): Promise<PieceAEnvoyer[]> {
  const out: PieceAEnvoyer[] = [];
  for (const f of fd.getAll("fichiers")) {
    if (typeof f === "string" || f.size === 0) continue;
    out.push({ type: "fichier", nom: f.name, mime: f.type, contenu: new Uint8Array(await f.arrayBuffer()) });
  }
  for (const r of fd.getAll("references")) {
    if (typeof r === "string" && r) out.push({ type: "reference", id: r });
  }
  return out;
}

/** Envoie une réponse ou un nouveau message (FormData : la rédaction peut joindre des fichiers). */
export async function envoyer(fd: FormData): Promise<{ conversation: Conversation; etat: EtatBoites }> {
  const { api } = await contexte();
  const texte = String(fd.get("texte") ?? "");
  const boiteId = String(fd.get("boiteId") ?? "") || undefined;
  const conversationId = String(fd.get("conversationId") ?? "");
  const piecesJointes = await piecesDuFormulaire(fd);
  let conversation: Conversation;
  if (conversationId) {
    conversation = await api.repondre(conversationId, { boiteId, texte, piecesJointes });
  } else {
    const a = String(fd.get("a") ?? "")
      .split(/[,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!a.length) throw new Error("Indiquez au moins un destinataire.");
    conversation = await api.ecrire({
      boiteId: boiteId ?? "",
      a,
      objet: String(fd.get("objet") ?? "").slice(0, 300),
      texte,
      piecesJointes,
    });
  }
  return { conversation, etat: await api.listerBoites() };
}

// --- IA (démo aujourd'hui, core_ai demain) ---

export async function iaRediger(entree: { conversationId?: string; consigne: string; boiteId?: string }): Promise<string> {
  const { api } = await contexte();
  return api.redigerBrouillon({
    conversationId: typeof entree?.conversationId === "string" ? entree.conversationId : undefined,
    consigne: String(entree?.consigne ?? "").slice(0, 1000),
    boiteId: typeof entree?.boiteId === "string" ? entree.boiteId : undefined,
  });
}

export async function iaReecrire(texte: string, mode: ModeReecriture): Promise<string> {
  const { api } = await contexte();
  const m: ModeReecriture = (["court", "formel", "chaleureux", "corriger"] as const).includes(mode) ? mode : "corriger";
  return api.reecrireTexte(String(texte ?? "").slice(0, 20000), m);
}

// --- Paramètres ---

export async function enregistrerParametres(p: Parametres): Promise<Parametres> {
  const { api } = await contexte();
  return api.enregistrerParametres(p);
}
