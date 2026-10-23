import { ErreurAffichable } from "@/lib/erreurs";
import "server-only";

import type { Commerce } from "@/lib/commerces";
import { GRAINES, graineDepuisFichier, type GraineCommerce } from "./demo-donnees";
import { filetHtml } from "./html";
import { pdfDemo } from "./pdf-demo";
import { dansVue } from "./vues";
import type {
  Boite,
  ContenuPieceJointe,
  Conversation,
  Correspondant,
  EtatBoites,
  FiltreListe,
  MailApi,
  Message,
  ModeReecriture,
  ModificationConversation,
  NouveauMessage,
  PageConversations,
  Parametres,
  PieceAEnvoyer,
  PieceJointe,
  Reponse,
  ResumeConversation,
  ResumeIA,
  Utilisateur,
} from "./types";

/**
 * Implémentation en mémoire, une par commerce, tant que core_comms n'est pas branché.
 * Les données vivent le temps du processus ; un redémarrage remet la démonstration à zéro.
 */

type Interne = Conversation & { ia: ResumeIA };
type Piece = PieceJointe & { conversationId: string; contenu?: Uint8Array; lignes?: string[] };
type Magasin = {
  conversations: Map<string, Interne>;
  pieces: Map<string, Piece>;
  parametres: Map<string, Parametres>;
  graine: GraineCommerce | null;
  suivant: number;
};

const globalDemo = globalThis as unknown as { __boiteDemo?: Map<string, Magasin> };
const magasins = (globalDemo.__boiteDemo ??= new Map<string, Magasin>());

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const extrait = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 160);

function deriver(c: Interne): Interne {
  const msgs = c.messages;
  const dernier = msgs[msgs.length - 1];
  const premierEntrant = msgs.find((m) => m.sens === "entrant");
  const noms: string[] = [];
  for (const m of msgs) {
    const n = m.sens === "sortant" ? "moi" : m.de.prenom || m.de.nom;
    if (!noms.includes(n)) noms.push(n);
  }
  const pjs = msgs.flatMap((m) => m.piecesJointes);
  c.participants = noms;
  c.correspondant = premierEntrant ? premierEntrant.de : (msgs[0]?.a[0] ?? null);
  c.extrait = dernier ? extrait(dernier.texte) : "";
  c.derniereDate = dernier ? dernier.date : new Date().toISOString();
  c.nbMessages = msgs.length;
  c.nbPiecesJointes = pjs.length;
  c.premierePieceJointe = pjs[0]?.nom ?? null;
  c.aEcrit = msgs.some((m) => m.sens === "sortant");
  c.aRecu = msgs.some((m) => m.sens === "entrant");
  return c;
}

function semer(commerce: Commerce): Magasin {
  const fabrique = GRAINES[commerce.slug];
  const graine = fabrique ? fabrique() : graineDepuisFichier(commerce.slug);
  const m: Magasin = { conversations: new Map(), pieces: new Map(), parametres: new Map(), graine, suivant: 1 };
  if (!graine) return m;
  const boites = new Map(commerce.boites.map((b) => [b.id, b]));
  const accueil = commerce.boites.find((b) => b.accueil)!;

  for (const g of graine.conversations) {
    const boite = boites.get(g.boite) ?? accueil;
    const messages: Message[] = g.messages.map((gm, i) => {
      const id = `${g.id}-m${i + 1}`;
      const pjs: PieceJointe[] = (gm.pj ?? []).map((p, j) => {
        const piece: Piece = {
          id: `${id}-pj${j + 1}`,
          nom: p.nom,
          type: p.type,
          taille: p.taille,
          conversationId: g.id,
          lignes: [g.objet, "", ...gm.texte.split("\n").slice(0, 18)],
        };
        m.pieces.set(piece.id, piece);
        return { id: piece.id, nom: p.nom, type: p.type, taille: p.taille };
      });
      const sortant = !gm.de;
      const de: Correspondant = sortant ? { nom: gm.signataire ?? commerce.nom, adresse: boite.adresse } : gm.de!;
      const autre = g.messages.find((x) => x.de)?.de;
      const a: Correspondant[] = sortant
        ? autre
          ? [{ nom: autre.nom, adresse: autre.adresse, prenom: autre.prenom }]
          : []
        : [{ nom: boite.libelle, adresse: boite.adresse }];
      return {
        id,
        sens: sortant ? "sortant" : "entrant",
        de,
        a,
        cc: [],
        objet: i === 0 ? g.objet : `Re : ${g.objet}`,
        date: gm.quand.toISOString(),
        texte: gm.texte,
        html: gm.html ? filetHtml(gm.html) : null,
        piecesJointes: pjs,
      };
    });
    const conv: Interne = {
      id: g.id,
      boiteId: boite.id,
      objet: g.objet,
      participants: [],
      correspondant: null,
      extrait: "",
      derniereDate: "",
      nbMessages: 0,
      nbPiecesJointes: 0,
      premierePieceJointe: null,
      lu: g.lu ?? true,
      suivi: g.suivi ?? false,
      archive: false,
      indesirable: g.indesirable ?? false,
      supprime: false,
      aEcrit: false,
      aRecu: false,
      brouillon: false,
      libelles: g.libelles ?? [],
      aTrier: g.aTrier ?? false,
      verdict: g.verdict
        ? {
            boiteId: g.verdict.boiteId,
            personne: null,
            confiance: g.verdict.confiance,
            indesirable: g.verdict.indesirable ?? false,
            raison: g.verdict.raison,
            libelles: g.verdict.libelles ?? [],
          }
        : null,
      corrige: false,
      messages,
      ia: g.ia,
    };
    m.conversations.set(conv.id, deriver(conv));
  }
  return m;
}

function magasin(commerce: Commerce): Magasin {
  let m = magasins.get(commerce.tenantId);
  if (!m) {
    m = semer(commerce);
    magasins.set(commerce.tenantId, m);
  }
  return m;
}

function parametresParDefaut(commerce: Commerce, graine: GraineCommerce | null): Parametres {
  return {
    signatures: Object.fromEntries(
      commerce.boites.map((b) => [b.id, b.signature ?? `${commerce.nom} · ${b.libelle}\n${b.adresse}`]),
    ),
    signatureNouveaux: true,
    signatureReponses: true,
    absence: {
      active: false,
      du: "",
      au: "",
      message: `Bonjour,\n\n${commerce.nom} est fermé pour les fêtes. Nous vous répondons dès notre retour.\n\nBelles fêtes !`,
      contactsSeulement: false,
    },
    reponsesTypes: commerce.reponsesTypes.map((r) => ({ ...r })),
    tri: {
      triIA: true,
      severite: "normal",
      bloques: [...(graine?.bloques ?? [])],
      confiance: [...(graine?.confiance ?? [])],
    },
    ia: { redaction: true, resumes: true },
  };
}

// --- Réécritures de démonstration (reprises de la maquette) ---

function plusCourt(t: string): string {
  const p = t.split(/\n\n+/);
  if (p.length < 3) return t;
  const premiere = p[1].split(/(?<=[.!?])\s+/)[0];
  return [p[0], premiere, p[p.length - 1]].join("\n\n");
}
function plusFormel(t: string): string {
  const p = t.split(/\n\n+/);
  if (p.length < 2) return t;
  p[p.length - 1] = "Je vous prie d’agréer mes sincères salutations.";
  return p.join("\n\n").replace(/\s!/g, ".").replace(/!/g, ".");
}
function plusChaleureux(t: string, fin: string): string {
  const p = t.split(/\n\n+/);
  if (p.length < 2) return `${t}\n\n${fin}`;
  p[p.length - 1] = fin;
  return p.join("\n\n");
}

export class DemoMailApi implements MailApi {
  readonly capacites = { suivis: true, envoyes: true, brouillons: true, corbeille: true, compteursDossiers: true, piecesJointesSortantes: true, ia: true, parametres: true, imagesParServeur: false } as const;
  private readonly commerce: Commerce;
  private readonly utilisateur: Utilisateur;

  constructor(commerce: Commerce, utilisateur: Utilisateur) {
    this.commerce = commerce;
    this.utilisateur = utilisateur;
  }

  private get m() {
    return magasin(this.commerce);
  }

  private boitesPermises(): Set<string> {
    const ids = this.commerce.boites.map((b) => b.id);
    const ouvertes = this.utilisateur.boites;
    return new Set(ouvertes ? ids.filter((i) => ouvertes.includes(i)) : ids);
  }

  private visibles(): Interne[] {
    const ok = this.boitesPermises();
    return [...this.m.conversations.values()].filter((c) => ok.has(c.boiteId));
  }

  private trouver(id: string): Interne {
    const c = this.m.conversations.get(id);
    if (!c || !this.boitesPermises().has(c.boiteId)) throw new ErreurAffichable("Conversation introuvable");
    return c;
  }

  private resume(c: Interne): ResumeConversation {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { messages, ia, ...r } = c;
    return { ...r, libelles: [...r.libelles] };
  }

  private complet(c: Interne): Conversation {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ia, ...r } = c;
    return structuredClone(r);
  }

  async listerBoites(): Promise<EtatBoites> {
    const vis = this.visibles();
    const recue = (c: Interne) => c.messages.some((m) => m.sens === "entrant");
    const vivante = (c: Interne) => !c.archive && !c.indesirable && !c.supprime && !c.brouillon;
    const permises = this.boitesPermises();
    const boites: Boite[] = this.commerce.boites
      .filter((b) => permises.has(b.id))
      .map((b) => ({
        id: b.id,
        adresse: b.adresse,
        libelle: b.libelle,
        description: b.description,
        accueil: !!b.accueil,
        nonLus: vis.filter((c) => c.boiteId === b.id && !c.aTrier && vivante(c) && recue(c) && !c.lu).length,
      }));
    const libelles: Record<string, number> = {};
    for (const l of this.commerce.libelles) {
      libelles[l.id] = vis.filter((c) => c.libelles.includes(l.id) && !c.lu && !c.indesirable && !c.supprime).length;
    }
    return {
      boites,
      compteurs: {
        aTrier: vis.filter((c) => c.aTrier && vivante(c)).length,
        indesirables: vis.filter((c) => c.indesirable && !c.supprime).length,
        corbeille: vis.filter((c) => c.supprime).length,
        brouillons: vis.filter((c) => c.brouillon && !c.supprime).length,
        libelles,
      },
    };
  }

  async listerConversations(filtre: FiltreListe): Promise<PageConversations> {
    const v = filtre.vue;
    let liste = this.visibles().filter((c) => dansVue(c, v));
    const q = sansAccents(filtre.q?.trim() ?? "");
    if (q) {
      liste = liste.filter((c) =>
        sansAccents(
          [
            c.objet,
            ...c.participants,
            ...c.messages.flatMap((m) => [m.de.nom, m.de.adresse, m.texte, ...m.piecesJointes.map((p) => p.nom)]),
          ].join(" "),
        ).includes(q),
      );
    }
    liste.sort((a, b) => b.derniereDate.localeCompare(a.derniereDate));
    return { conversations: liste.map((c) => this.resume(c)), curseurSuivant: null };
  }

  async lireConversation(id: string, _options?: { imagesDistantes?: boolean }): Promise<Conversation> {
    void _options;
    return this.complet(this.trouver(id));
  }

  private pieces(conversationId: string, pj: PieceAEnvoyer[] | undefined): PieceJointe[] {
    const out: PieceJointe[] = [];
    for (const p of pj ?? []) {
      const id = `pj-${Date.now().toString(36)}-${this.m.suivant++}`;
      if (p.type === "fichier") {
        this.m.pieces.set(id, { id, nom: p.nom, type: p.mime || "application/octet-stream", taille: p.contenu.byteLength, conversationId, contenu: p.contenu });
        out.push({ id, nom: p.nom, type: p.mime || "application/octet-stream", taille: p.contenu.byteLength });
      } else {
        const src = this.m.pieces.get(p.id);
        if (!src) continue;
        this.trouver(src.conversationId); // contrôle d'accès à la pièce d'origine
        this.m.pieces.set(id, { ...src, id, conversationId });
        out.push({ id, nom: src.nom, type: src.type, taille: src.taille });
      }
    }
    return out;
  }

  private boiteEnvoi(boiteId: string | undefined, repli: string) {
    const id = boiteId && this.boitesPermises().has(boiteId) ? boiteId : repli;
    const b = this.commerce.boites.find((x) => x.id === id);
    if (!b || !this.boitesPermises().has(b.id)) throw new ErreurAffichable("Boîte d’envoi non autorisée");
    return b;
  }

  async repondre(conversationId: string, reponse: Reponse): Promise<Conversation> {
    const c = this.trouver(conversationId);
    const b = this.boiteEnvoi(reponse.boiteId, c.boiteId);
    const id = `${c.id}-m${c.messages.length + 1}-${this.m.suivant++}`;
    c.messages.push({
      id,
      sens: "sortant",
      de: { nom: this.utilisateur.nom, adresse: b.adresse },
      a: c.correspondant ? [c.correspondant] : [],
      cc: [],
      objet: c.objet.startsWith("Re : ") ? c.objet : `Re : ${c.objet}`,
      date: new Date().toISOString(),
      texte: reponse.texte,
      html: null,
      piecesJointes: this.pieces(c.id, reponse.piecesJointes),
    });
    c.lu = true;
    deriver(c);
    return this.complet(c);
  }

  async ecrire(message: NouveauMessage): Promise<Conversation> {
    const accueil = this.commerce.boites.find((b) => b.accueil)!.id;
    const b = this.boiteEnvoi(message.boiteId, accueil);
    const id = `n-${Date.now().toString(36)}-${this.m.suivant++}`;
    const a = message.a.map((x) => {
      const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(x);
      return m ? { nom: m[1] || m[2], adresse: m[2] } : { nom: x.trim(), adresse: x.trim() };
    });
    const conv: Interne = {
      id,
      boiteId: b.id,
      objet: message.objet || "(Sans objet)",
      participants: [],
      correspondant: null,
      extrait: "",
      derniereDate: "",
      nbMessages: 0,
      nbPiecesJointes: 0,
      premierePieceJointe: null,
      lu: true,
      suivi: false,
      archive: false,
      indesirable: false,
      supprime: false,
      aEcrit: true,
      aRecu: false,
      brouillon: false,
      libelles: [],
      aTrier: false,
      verdict: null,
      corrige: false,
      messages: [],
      ia: { points: [`Message envoyé à ${a.map((x) => x.nom).join(", ") || "un destinataire"}.`], aFaire: null, suggestions: [] },
    };
    this.m.conversations.set(id, conv);
    conv.messages.push({
      id: `${id}-m1`,
      sens: "sortant",
      de: { nom: this.utilisateur.nom, adresse: b.adresse },
      a,
      cc: (message.cc ?? []).map((x) => ({ nom: x, adresse: x })),
      objet: conv.objet,
      date: new Date().toISOString(),
      texte: message.texte,
      html: null,
      piecesJointes: this.pieces(id, message.piecesJointes),
    });
    deriver(conv);
    return this.complet(conv);
  }

  async modifierConversation(id: string, mod: ModificationConversation): Promise<void> {
    const c = this.trouver(id);
    if (mod.boiteId !== undefined && mod.boiteId !== c.boiteId) {
      if (!this.boitesPermises().has(mod.boiteId)) throw new ErreurAffichable("Boîte non autorisée");
      c.boiteId = mod.boiteId;
      c.corrige = true;
      // Correction de Jev, journalisée sans contenu ni adresse (amendement 6).
      console.info("[demo] correction de boîte", { conversation: c.id, boite: mod.boiteId });
    }
    if (mod.boiteId !== undefined) c.aTrier = false;
    if (mod.libelles !== undefined) {
      const connus = new Set(this.commerce.libelles.map((l) => l.id));
      const avant = c.libelles.join(",");
      c.libelles = [...new Set(mod.libelles.filter((l) => connus.has(l)))];
      if (c.verdict?.libelles.length && avant !== c.libelles.join(",")) {
        c.corrige = true;
        console.info("[demo] correction de libellé", { conversation: c.id });
      }
    }
    if (mod.indesirable !== undefined && mod.indesirable !== c.indesirable) {
      c.indesirable = mod.indesirable;
      console.info("[demo] correction indésirable", { conversation: c.id, indesirable: mod.indesirable });
    }
    if (mod.lu !== undefined) c.lu = mod.lu;
    if (mod.archive !== undefined) c.archive = mod.archive;
    if (mod.suivi !== undefined) c.suivi = mod.suivi;
    if (mod.supprime !== undefined) c.supprime = mod.supprime;
  }

  async telechargerPieceJointe(id: string): Promise<ContenuPieceJointe> {
    const p = this.m.pieces.get(id);
    if (!p) throw new ErreurAffichable("Pièce jointe introuvable");
    this.trouver(p.conversationId);
    const contenu = p.contenu ?? pdfDemo(p.nom.replace(/\.pdf$/i, "").replace(/-/g, " "), p.lignes ?? []);
    return { id: p.id, nom: p.nom, type: p.contenu ? p.type : "application/pdf", taille: contenu.byteLength, contenu };
  }

  async resumerConversation(id: string): Promise<ResumeIA> {
    return structuredClone(this.trouver(id).ia);
  }

  async redigerBrouillon(entree: { conversationId?: string; consigne: string }): Promise<string> {
    if (entree.conversationId) {
      const c = this.trouver(entree.conversationId);
      if (c.ia.suggestions[0]) return c.ia.suggestions[0].brouillon;
    }
    return this.m.graine?.generique ?? "Bonjour,\n\nMerci pour votre message.\n\nBelle journée,";
  }

  async reecrireTexte(texte: string, mode: ModeReecriture): Promise<string> {
    switch (mode) {
      case "court":
        return plusCourt(texte);
      case "formel":
        return plusFormel(texte);
      case "chaleureux":
        return plusChaleureux(texte, this.m.graine?.chaleureux ?? "Au plaisir de vous lire !");
      case "corriger":
        return texte;
    }
  }

  async lireParametres(): Promise<Parametres> {
    const cle = this.utilisateur.email.toLowerCase();
    let p = this.m.parametres.get(cle);
    if (!p) {
      p = parametresParDefaut(this.commerce, this.m.graine);
      this.m.parametres.set(cle, p);
    }
    return structuredClone(p);
  }

  async enregistrerParametres(p: Parametres): Promise<Parametres> {
    const base = await this.lireParametres();
    const ids = new Set(this.commerce.boites.map((b) => b.id));
    const propre: Parametres = {
      ...base,
      ...p,
      signatures: Object.fromEntries(Object.entries(p.signatures ?? {}).filter(([k]) => ids.has(k)).map(([k, v]) => [k, String(v).slice(0, 2000)])),
      reponsesTypes: (p.reponsesTypes ?? []).slice(0, 50).map((r) => ({ titre: String(r.titre).slice(0, 120), corps: String(r.corps).slice(0, 5000) })),
    };
    this.m.parametres.set(this.utilisateur.email.toLowerCase(), structuredClone(propre));
    return propre;
  }
}
