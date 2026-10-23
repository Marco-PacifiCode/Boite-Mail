/**
 * Types de la boîte mail. Ils suivent le contrat de l'API core_comms
 * (BOITE-ARCHITECTURE.md, « API pour l'appli de boîte ») ; les noms sont en français
 * côté appli, la correspondance avec les champs du contrat est indiquée en commentaire.
 */

/** Une boîte du commerce (contrat : `Mailbox`). */
export type Boite = {
  id: string;
  /** adresse complète, ex. `facturation@exemple.nc` */
  adresse: string;
  libelle: string;
  /** critère donné à Jev pour ranger les mails */
  description: string;
  accueil: boolean;
  /** conversations non lues, hors archives, indésirables et corbeille */
  nonLus: number;
};

/** Compteurs de la colonne de navigation. */
export type Compteurs = {
  /** conversations que Jev n'a pas su ranger (confiance sous le seuil) */
  aTrier: number;
  indesirables: number;
  corbeille: number;
  brouillons: number;
  /** non-lus par libellé */
  libelles: Record<string, number>;
};

/** Réponse de `GET /api/mail/mailboxes`. Les compteurs autres que par boîte sont une extension
 * du contrat, à demander à core_comms (sinon : un appel par dossier). */
export type EtatBoites = {
  boites: Boite[];
  compteurs: Compteurs;
};

export type Libelle = {
  id: string;
  nom: string;
  teinte: string;
};

export type Correspondant = {
  nom: string;
  adresse: string;
  /** prénom, quand on le connaît (réponses types : `{prenom}`) */
  prenom?: string;
};

/** Métadonnées d'une pièce jointe (contrat : `MailAttachment`). Le contenu se lit par
 * `GET /api/mail/attachments/:id`, après contrôle d'accès. */
export type PieceJointe = {
  id: string;
  nom: string;
  type: string;
  /** octets */
  taille: number;
};

/** Verdict de Jev, produit par core_comms à la réception (module comms.mail.tri de core_ai). */
export type VerdictJev = {
  /** boîte choisie, `null` quand la confiance est sous le seuil (la conversation va dans « À trier ») */
  boiteId: string | null;
  /** personne choisie, quand Jev attribue à quelqu'un plutôt qu'à une boîte */
  personne: string | null;
  /** 0 à 1 */
  confiance: number;
  indesirable: boolean;
  /** explication courte, affichée telle quelle à l'utilisateur */
  raison: string;
  /** libellés posés par le tri automatique */
  libelles: string[];
};

/** Message d'une conversation (contrat : `MailMessage`). */
export type Message = {
  id: string;
  /** `entrant` = reçu ; `sortant` = envoyé depuis une boîte du commerce */
  sens: "entrant" | "sortant";
  de: Correspondant;
  a: Correspondant[];
  cc: Correspondant[];
  objet: string;
  /** ISO 8601 */
  date: string;
  texte: string;
  /** HTML déjà nettoyé par core_comms (amendement 2). Affiché dans une iframe sandbox. */
  html: string | null;
  piecesJointes: PieceJointe[];
};

/** Ligne de la liste des conversations (contrat : `MailThread`, vue résumée). */
export type ResumeConversation = {
  id: string;
  boiteId: string;
  objet: string;
  /** noms des participants, dans l'ordre d'apparition (« moi » pour la boîte) */
  participants: string[];
  /** correspondant principal (premier expéditeur extérieur) */
  correspondant: Correspondant | null;
  extrait: string;
  /** ISO 8601 du dernier message */
  derniereDate: string;
  nbMessages: number;
  nbPiecesJointes: number;
  premierePieceJointe: string | null;
  lu: boolean;
  suivi: boolean;
  archive: boolean;
  indesirable: boolean;
  supprime: boolean;
  /** la boîte a déjà écrit dans cette conversation */
  aEcrit: boolean;
  /** la conversation contient au moins un message reçu */
  aRecu: boolean;
  /** brouillon non envoyé */
  brouillon: boolean;
  libelles: string[];
  /** Jev n'a pas su choisir la boîte : la conversation attend dans « À trier » */
  aTrier: boolean;
  verdict: VerdictJev | null;
  /** l'utilisateur a corrigé le tri (boîte ou libellé) : la mention « par Jev » disparaît */
  corrige: boolean;
};

export type Conversation = ResumeConversation & {
  messages: Message[];
  imagesDistantesBloquees?: number;
  imagesDistantesAutorisees?: boolean;
};

export type Capacites = { suivis: boolean; envoyes: boolean; brouillons: boolean; corbeille: boolean; compteursDossiers: boolean; piecesJointesSortantes: boolean; ia: boolean; parametres: boolean; imagesParServeur: boolean };

/** Vue demandée à la liste (contrat : `GET /api/mail/threads?mailbox=&label=&folder=&q=&cursor=`). */
export type Dossier = "suivis" | "envoyes" | "brouillons" | "archives" | "indesirables" | "corbeille";

export type Vue =
  | { type: "boite"; id: string }
  | { type: "aTrier" }
  | { type: "dossier"; id: Dossier }
  | { type: "libelle"; id: string };

export type FiltreListe = {
  vue: Vue;
  q?: string;
  curseur?: string;
};

export type PageConversations = {
  conversations: ResumeConversation[];
  curseurSuivant: string | null;
};

/** Contrat : `PATCH /api/mail/threads/:id`. `suivi` et `supprime` sont des extensions à
 * demander à core_comms (le contrat ne couvre que boîte, libellés, lu, archivé, spam). */
export type ModificationConversation = {
  boiteId?: string;
  libelles?: string[];
  lu?: boolean;
  archive?: boolean;
  indesirable?: boolean;
  suivi?: boolean;
  supprime?: boolean;
};

/** Pièce jointe à envoyer : soit un nouveau fichier, soit une pièce déjà reçue (transfert). */
export type PieceAEnvoyer =
  | { type: "fichier"; nom: string; mime: string; contenu: Uint8Array }
  | { type: "reference"; id: string };

/** Contrat : `POST /api/mail/threads/:id/reply`. */
export type Reponse = {
  /** boîte d'envoi ; par défaut celle de la conversation */
  boiteId?: string;
  texte: string;
  html?: string;
  piecesJointes?: PieceAEnvoyer[];
};

/** Contrat : `POST /api/mail/send`. */
export type NouveauMessage = {
  boiteId: string;
  a: string[];
  cc?: string[];
  objet: string;
  texte: string;
  html?: string;
  piecesJointes?: PieceAEnvoyer[];
};

export type ContenuPieceJointe = PieceJointe & { contenu: Uint8Array };

/** Résumé d'un fil par l'IA (core_ai, plus tard). */
export type ResumeIA = {
  points: string[];
  aFaire: string | null;
  suggestions: { libelle: string; brouillon: string }[];
};

export type ModeReecriture = "court" | "formel" | "chaleureux" | "corriger";

/** Paramètres de fond de l'utilisateur (hors contrat core_comms : stockage à décider). */
export type Parametres = {
  signatures: Record<string, string>;
  signatureNouveaux: boolean;
  signatureReponses: boolean;
  absence: {
    active: boolean;
    du: string;
    au: string;
    message: string;
    contactsSeulement: boolean;
  };
  reponsesTypes: { titre: string; corps: string }[];
  tri: {
    triIA: boolean;
    severite: "souple" | "normal" | "strict";
    bloques: string[];
    confiance: string[];
  };
  ia: {
    redaction: boolean;
    resumes: boolean;
  };
};

/**
 * Accès aux données de la boîte, pour un utilisateur d'un commerce.
 * Une instance est liée à un commerce et à un utilisateur : chaque appel est vérifié
 * contre ses droits (`MailboxAccess` côté core_comms).
 */
export interface MailApi {
  readonly capacites: Capacites;
  // --- Boîtes et conversations (core_comms) ---
  listerBoites(): Promise<EtatBoites>;
  listerConversations(filtre: FiltreListe): Promise<PageConversations>;
  lireConversation(id: string, options?: { imagesDistantes?: boolean }): Promise<Conversation>;
  repondre(conversationId: string, reponse: Reponse): Promise<Conversation>;
  ecrire(message: NouveauMessage): Promise<Conversation>;
  modifierConversation(id: string, modification: ModificationConversation): Promise<void>;
  telechargerPieceJointe(id: string): Promise<ContenuPieceJointe>;

  // --- IA (core_ai, plus tard) ---
  resumerConversation(id: string): Promise<ResumeIA>;
  redigerBrouillon(entree: { conversationId?: string; consigne: string; boiteId?: string }): Promise<string>;
  reecrireTexte(texte: string, mode: ModeReecriture): Promise<string>;

  // --- Paramètres de l'utilisateur (hors contrat) ---
  lireParametres(): Promise<Parametres>;
  enregistrerParametres(p: Parametres): Promise<Parametres>;
}

/** Identité de l'utilisateur connecté, telle que la session la donne. */
export type Utilisateur = {
  email: string;
  nom: string;
  tenantId: string;
  /** boîtes ouvertes à cet utilisateur ; `null` = toutes (mode démo) */
  boites: string[] | null;
  /** jeton core_auth (jws-e2) à transmettre à core_comms ; absent en démo */
  jeton?: string;
  jetonCookie?: string;
  /** identifiant et rôle de la personne chez core_auth ; absents en démo */
  coreUserId?: string;
  role?: string;
  /** fin de validité du jeton core_auth (ms depuis l'époque) */
  jetonExpire?: number;
};
