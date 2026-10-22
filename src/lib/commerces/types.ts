/**
 * Configuration d'un commerce : qui il est, à quoi ressemble sa boîte, quelles adresses il reçoit.
 *
 * Elle vient d'un fichier JSON privé, hors dépôt (variable BOITE_COMMERCES_FICHIER).
 * Le dépôt est public : rien de propre à un commerce n'y est codé en dur.
 */

/** Jetons de couleur d'un mode (clair ou sombre). Tous facultatifs dans le JSON : les manquants
 * prennent les valeurs neutres de `theme.ts`. */
export type Jetons = {
  /** fond de page, derrière les panneaux */
  fond: string;
  /** panneaux (liste, lecture, rédaction) */
  surface: string;
  /** éléments en relief sur une surface (boutons discrets, encadrés) */
  releve: string;
  /** champs de saisie */
  saisie: string;
  texte: string;
  /** texte secondaire : 4,5:1 au moins sur `surface` et sur `releve` */
  attenue: string;
  bordure: string;
  /** contour des champs et cibles de dépôt : 3:1 au moins sur `surface` */
  bordureForte: string;
  /** couleur de marque en aplat (bouton Écrire, Envoyer, filtre actif) */
  accent: string;
  /** texte posé sur `accent` */
  surAccent: string;
  /** couleur de marque utilisée comme texte ou trait : 4,5:1 au moins sur `surface` et `selection` */
  encreAccent: string;
  /** fond de l'élément sélectionné (dossier courant, conversation ouverte) */
  selection: string;
  etoile: string;
  toastFond: string;
  toastTexte: string;
  toastAction: string;
  /** bandeau de rédaction assistée */
  iaFond: string;
  /** voile de la zone de dépôt de fichiers */
  depotFond: string;
  alerteFond: string;
  alerteTexte: string;
  /** voile derrière un tiroir ou une feuille */
  voile: string;
  /** fond révélé quand on glisse une conversation pour l'archiver */
  balayageArchiver: string;
  /** fond révélé quand on glisse une conversation pour la supprimer */
  balayageSupprimer: string;
  surBalayage: string;
  /** anneau de focus clavier : 3:1 au moins sur `surface` et `fond` */
  anneau: string;
  /** panneau de marque de la page de connexion */
  panneauFond: string;
  panneauTexte: string;
};

/** Clés des polices disponibles (chargées par next/font, voir `src/lib/polices.ts`). */
export type ClePolice = "manrope" | "inter" | "poppins" | "fraunces" | "playfair-display";

export type Theme = {
  clair: Partial<Jetons>;
  sombre: Partial<Jetons>;
  polices: {
    /** texte courant de l'interface */
    texte: ClePolice;
    /** nom du commerce, grands titres de la page de connexion */
    titres: ClePolice;
  };
  logo: {
    /** lettre affichée quand il n'y a pas d'image */
    initiale: string;
    /** chemin public d'une image carrée (facultatif) */
    image?: string;
  };
  icones: {
    favicon: string;
    icone192: string;
    icone512: string;
    /** PNG 180 × 180 pour l'écran d'accueil iOS (facultatif) */
    apple?: string;
  };
  /** barre d'état et barre de titre de l'appli installée */
  couleurPwa: string;
  /** fond de l'écran de lancement de l'appli installée */
  fondPwa: string;
};

/** Une adresse de réception du commerce. */
export type BoiteConfig = {
  id: string;
  adresse: string;
  libelle: string;
  /** Critère donné à Jev pour ranger un mail dans cette boîte. */
  description: string;
  /** Boîte d'accueil : reçoit ce qui n'est adressé à aucune autre. Une seule par commerce. */
  accueil?: boolean;
  /** Signature proposée par défaut, modifiable dans les paramètres. */
  signature?: string;
};

/** Teinte d'une puce de libellé. Les couleurs exactes (clair/sombre) sont dans `theme.ts`. */
export type TeinteLibelle = "bleu" | "violet" | "orange" | "vert" | "jaune" | "rose";

export type LibelleConfig = {
  id: string;
  nom: string;
  teinte: TeinteLibelle;
};

export type ReponseTypeConfig = {
  titre: string;
  /** `{prenom}` est remplacé par le prénom du correspondant quand on le connaît. */
  corps: string;
};

export type Commerce = {
  /** Nom d'hôte principal de la boîte, ex. `mail.exemple.nc`. */
  hote: string;
  /** Autres noms d'hôte servant le même commerce (développement, ancien domaine). */
  alias?: string[];
  slug: string;
  /** Identifiant du tenant dans les Cores (core_auth, core_comms). */
  tenantId: string;
  nom: string;
  /** Sous-titre court sous le nom (« École de danse »). */
  accroche: string;
  /** Domaine des adresses (`exemple.nc`). Les boîtes reçoivent sur ce domaine. */
  domaine: string;
  /** Fuseau horaire des dates affichées. */
  fuseau: string;
  theme: Theme;
  boites: BoiteConfig[];
  libelles: LibelleConfig[];
  reponsesTypes: ReponseTypeConfig[];
  connexion?: {
    titre?: string;
    texte?: string;
    /** exemple d'adresse dans le champ de connexion */
    exempleAdresse?: string;
  };
};
