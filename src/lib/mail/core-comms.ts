import { ErreurAffichable } from "@/lib/erreurs";
import "server-only";

import type { Commerce } from "@/lib/commerces";
import type {
  Boite,
  Capacites,
  ContenuPieceJointe,
  Conversation,
  EtatBoites,
  FiltreListe,
  MailApi,
  Message,
  ModificationConversation,
  NouveauMessage,
  PageConversations,
  Parametres,
  Reponse,
  ResumeConversation,
  Utilisateur,
} from "./types";

/**
 * Implémentation par l'API mail de core_comms (`01-Core-Comms`, `core/lib/mail/CONTRAT.md` §3).
 *
 * Appels serveur à serveur seulement. Chaque appel porte la clé de l'appli (`COMMS_MAIL_APP_KEY`)
 * ET le jeton de session core_auth de l'utilisateur : core_comms vérifie lui-même qui est connecté
 * et quelles boîtes lui sont ouvertes (amendement 1). La boîte ne déclare jamais un userId ni un tenant.
 *
 * Ce que core_comms ne fournit pas encore (suivis, envoyés, brouillons, corbeille, compteurs par
 * dossier, pièces jointes sortantes, IA, paramètres) est déclaré dans `capacites` : l'interface le
 * masque au lieu de l'appeler.
 */

const CAPACITES: Capacites = {
  suivis: false,
  envoyes: false,
  brouillons: false,
  corbeille: false,
  compteursDossiers: false,
  piecesJointesSortantes: false,
  ia: false,
  parametres: false,
  imagesParServeur: true,
};

const INDISPONIBLE = "Messagerie indisponible pour le moment.";
const INTROUVABLE = "Conversation, boîte ou pièce jointe introuvable.";
const PJ_SORTANTES = "Les pièces jointes ne sont pas encore disponibles à l'envoi.";

/** Codes d'erreur 400 du contrat, rendus lisibles. Un code inconnu donne « Demande refusée. ». */
const ERREURS_400: Record<string, string> = {
  pieces_jointes_sortantes_non_prises_en_charge: PJ_SORTANTES,
  destinataire_invalide: "Aucun destinataire valide pour cette réponse.",
};

type Json = Record<string, unknown>;
const objet = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const texte = (v: unknown, defaut = "") => (typeof v === "string" ? v : defaut);
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const textes = (v: unknown) => liste(v).filter((s): s is string => typeof s === "string");
const nombre = (v: unknown, defaut = 0) => (typeof v === "number" && Number.isFinite(v) ? v : defaut);

/** Nom court de l'appel, pour les journaux (jamais d'adresse, d'objet ni de contenu : amendement 6). */
function nomAppel(chemin: string, methode: string): string {
  if (chemin.startsWith("/api/mail/mailboxes")) return "mailboxes";
  if (chemin.startsWith("/api/mail/attachments/")) return "attachment";
  if (chemin.startsWith("/api/mail/send")) return "send";
  if (chemin.endsWith("/reply")) return "reply";
  if (chemin.startsWith("/api/mail/threads?")) return "threads";
  if (methode === "PATCH") return "patch";
  if (methode === "DELETE") return "delete";
  return "detail";
}

/** `comms-pj:<attachmentId>` (images en ligne nettoyées par core_comms) → proxy de pièce jointe de la boîte. */
function pointerPiecesEnLigne(html: string): string {
  return html.replace(/comms-pj:([0-9a-fA-F-]{36})/g, (_tout, id: string) => `/api/pieces/${id}`);
}

/** Résumé d'un fil. Les champs `from`, `snippet`, compteurs… sont optionnels (v1.1 de core_comms) : repli sinon. */
function resume(v: unknown): ResumeConversation {
  const f = objet(v);
  const de = f.from && typeof f.from === "object" ? objet(f.from) : null;
  const tri = f.triage && typeof f.triage === "object" ? objet(f.triage) : null;
  return {
    id: texte(f.id),
    boiteId: texte(f.mailboxId),
    objet: texte(f.subject, "(sans objet)"),
    participants: [],
    correspondant: de ? { nom: texte(de.name) || texte(de.address), adresse: texte(de.address) } : null,
    extrait: texte(f.snippet),
    derniereDate: texte(f.lastMessageAt),
    nbMessages: nombre(f.messageCount, 1),
    nbPiecesJointes: nombre(f.attachmentCount),
    premierePieceJointe: typeof f.firstAttachmentName === "string" ? f.firstAttachmentName : null,
    lu: f.unread !== true,
    suivi: false,
    archive: f.archived === true,
    indesirable: f.spam === true,
    supprime: false,
    aEcrit: f.hasOutbound === true,
    aRecu: f.hasInbound === undefined ? true : f.hasInbound === true,
    brouillon: false,
    libelles: textes(f.labels),
    aTrier: f.triageStatus === "A_TRIER",
    verdict: tri
      ? {
          boiteId: typeof tri.mailboxId === "string" ? tri.mailboxId : null,
          personne: null,
          confiance: nombre(tri.confiance),
          indesirable: tri.spam === true,
          raison: "",
          libelles: textes(tri.labels),
        }
      : null,
    corrige: false,
  };
}

function message(v: unknown): Message {
  const m = objet(v);
  const correspondants = (adresses: unknown) => textes(adresses).map((adresse) => ({ adresse, nom: adresse }));
  return {
    id: texte(m.id),
    sens: m.direction === "OUT" ? "sortant" : "entrant",
    de: { adresse: texte(m.fromAddress), nom: texte(m.fromName) || texte(m.fromAddress) },
    a: correspondants(m.toAddresses),
    cc: correspondants(m.ccAddresses),
    objet: texte(m.subject),
    date: texte(m.sentAt),
    texte: texte(m.text),
    html: typeof m.html === "string" && m.html ? pointerPiecesEnLigne(m.html) : null,
    piecesJointes: liste(m.attachments).map((p) => {
      const a = objet(p);
      return { id: texte(a.id), nom: texte(a.filename), type: texte(a.contentType), taille: nombre(a.size) };
    }),
  };
}

/** Nom de fichier de `Content-Disposition` (`filename*` d'abord). */
function nomFichier(disposition: string): string {
  const etoile = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (etoile) {
    try {
      return decodeURIComponent(etoile);
    } catch {
      /* encodage invalide : repli ci-dessous */
    }
  }
  return /filename="?([^";]+)/i.exec(disposition)?.[1] ?? "piece-jointe";
}

function parametresParDefaut(): Parametres {
  return {
    signatures: {},
    signatureNouveaux: false,
    signatureReponses: false,
    absence: { active: false, du: "", au: "", message: "", contactsSeulement: false },
    reponsesTypes: [],
    tri: { triIA: false, severite: "normal", bloques: [], confiance: [] },
    ia: { redaction: false, resumes: false },
  };
}

export function creerCoreCommsApi(commerce: Commerce, utilisateur: Utilisateur): MailApi {
  const base = process.env.COMMS_URL?.trim().replace(/\/+$/, "");
  const cle = process.env.COMMS_MAIL_APP_KEY;
  const jeton = utilisateur.jeton;
  if (!base || !cle || !jeton) {
    throw new Error("BOITE_SOURCE=core-comms exige COMMS_URL, COMMS_MAIL_APP_KEY et BOITE_AUTH=core-auth");
  }

  async function appeler(chemin: string, init: RequestInit = {}): Promise<Response> {
    const appel = nomAppel(chemin, init.method ?? "GET");
    let res: Response;
    try {
      res = await fetch(`${base}${chemin}`, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        headers: {
          "X-Core-Key": cle!,
          Authorization: `Bearer ${jeton}`,
          ...(utilisateur.jetonCookie ? { "X-Session-Cookie-Name": utilisateur.jetonCookie } : {}),
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
      });
    } catch {
      console.error("comms.echec", { action: appel, statut: "reseau" });
      throw new ErreurAffichable(INDISPONIBLE);
    }
    if (res.ok) return res;
    const corps = objet(await res.json().catch(() => null));
    console.error("comms.echec", { action: appel, statut: res.status });
    if (res.status === 401) throw new ErreurAffichable("Session expirée : reconnectez-vous.");
    if (res.status === 403) throw new ErreurAffichable("Accès refusé.");
    if (res.status === 404) throw new ErreurAffichable(INTROUVABLE);
    if (res.status === 409 && corps.error === "expediteur_non_autorise") {
      throw new ErreurAffichable("Cette boîte ne peut pas envoyer avec cette adresse.");
    }
    if (res.status === 400) throw new ErreurAffichable(ERREURS_400[texte(corps.error)] ?? "Demande refusée.");
    throw new ErreurAffichable(INDISPONIBLE);
  }

  const lireJson = async (chemin: string, init?: RequestInit) => objet(await (await appeler(chemin, init)).json());
  const cheminFil = (id: string) => `/api/mail/threads/${encodeURIComponent(id)}`;

  /** Lit un fil. ⚠️ core_comms le marque comme lu à chaque lecture du détail. */
  async function lireConversation(id: string, options?: { imagesDistantes?: boolean }): Promise<Conversation> {
    const f = await lireJson(`${cheminFil(id)}${options?.imagesDistantes ? "?images=distantes" : ""}`);
    return { ...resume(f), messages: liste(f.messages).map(message), imagesDistantesBloquees: nombre(f.imagesDistantesBloquees) };
  }

  return {
    capacites: CAPACITES,

    async listerBoites(): Promise<EtatBoites> {
      const r = await lireJson("/api/mail/mailboxes");
      const boites = liste(r.mailboxes).map((v): Boite => {
        const b = objet(v);
        const adresse = texte(b.address);
        // Description (critère de tri) et boîte d'accueil : reprises de la configuration du commerce.
        const conf = commerce.boites.find((c) => c.adresse.toLowerCase() === adresse.toLowerCase());
        return {
          id: texte(b.id),
          adresse,
          libelle: texte(b.label) || conf?.libelle || adresse,
          description: conf?.description ?? "",
          accueil: conf?.accueil ?? false,
          nonLus: nombre(b.unread),
        };
      });
      return { boites, compteurs: { aTrier: 0, indesirables: 0, corbeille: 0, brouillons: 0, libelles: {} } };
    },

    async listerConversations({ vue, q, curseur }: FiltreListe): Promise<PageConversations> {
      const p = new URLSearchParams();
      if (vue.type === "boite") p.set("mailbox", vue.id);
      else if (vue.type === "aTrier") p.set("folder", "a-trier");
      else if (vue.type === "libelle") p.set("label", vue.id.slice(0, 40));
      else if (vue.id === "archives") p.set("folder", "archived");
      else if (vue.id === "indesirables") p.set("folder", "spam");
      // Suivis, envoyés, brouillons, corbeille : pas encore dans le contrat (masqués par `capacites`).
      else return { conversations: [], curseurSuivant: null };
      if (q) p.set("q", q.slice(0, 100));
      if (curseur) p.set("cursor", curseur);
      const r = await lireJson(`/api/mail/threads?${p}`);
      return { conversations: liste(r.threads).map(resume), curseurSuivant: typeof r.cursor === "string" ? r.cursor : null };
    },

    lireConversation,

    async repondre(id: string, reponse: Reponse): Promise<Conversation> {
      if (reponse.piecesJointes?.length) throw new ErreurAffichable(PJ_SORTANTES);
      if (reponse.boiteId) {
        const c = await lireConversation(id);
        if (reponse.boiteId !== c.boiteId) throw new ErreurAffichable("Répondez depuis la boîte de la conversation.");
      }
      await lireJson(`${cheminFil(id)}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: reponse.texte, ...(reponse.html ? { html: reponse.html } : {}) }),
      });
      return lireConversation(id);
    },

    async ecrire(m: NouveauMessage): Promise<Conversation> {
      if (m.piecesJointes?.length) throw new ErreurAffichable(PJ_SORTANTES);
      const r = await lireJson("/api/mail/send", {
        method: "POST",
        body: JSON.stringify({
          mailboxId: m.boiteId,
          to: m.a,
          ...(m.cc?.length ? { cc: m.cc } : {}),
          subject: m.objet,
          text: m.texte,
          ...(m.html ? { html: m.html } : {}),
        }),
      });
      const filId = texte(r.threadId);
      if (!filId) throw new ErreurAffichable(INDISPONIBLE);
      return lireConversation(filId);
    },

    async modifierConversation(id: string, m: ModificationConversation): Promise<void> {
      if (m.suivi !== undefined || m.supprime !== undefined) throw new ErreurAffichable("Action pas encore disponible.");
      // Pas de relecture du fil après coup : le détail le marquerait comme lu (« Marquer non lu » serait annulé).
      await lireJson(cheminFil(id), {
        method: "PATCH",
        body: JSON.stringify({
          ...(m.boiteId !== undefined ? { mailboxId: m.boiteId } : {}),
          ...(m.libelles !== undefined ? { labels: m.libelles } : {}),
          ...(m.lu !== undefined ? { read: m.lu } : {}),
          ...(m.archive !== undefined ? { archived: m.archive } : {}),
          ...(m.indesirable !== undefined ? { spam: m.indesirable } : {}),
        }),
      });
    },

    async telechargerPieceJointe(id: string): Promise<ContenuPieceJointe> {
      const r = await appeler(`/api/mail/attachments/${encodeURIComponent(id)}`);
      const contenu = new Uint8Array(await r.arrayBuffer());
      return {
        id,
        nom: nomFichier(r.headers.get("content-disposition") ?? ""),
        type: r.headers.get("content-type")?.split(";")[0].trim() || "application/octet-stream",
        taille: contenu.byteLength,
        contenu,
      };
    },

    // IA et paramètres : hors contrat pour l'instant (masqués par `capacites`).
    async resumerConversation() {
      throw new ErreurAffichable("L'assistant n'est pas encore disponible.");
    },
    async redigerBrouillon() {
      throw new ErreurAffichable("L'assistant n'est pas encore disponible.");
    },
    async reecrireTexte() {
      throw new ErreurAffichable("L'assistant n'est pas encore disponible.");
    },
    async lireParametres() {
      return parametresParDefaut();
    },
    async enregistrerParametres() {
      throw new ErreurAffichable("Paramètres pas encore disponibles.");
    },
  };
}
