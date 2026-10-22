import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResumeIA } from "./types";

/**
 * Données de démonstration, fictives. Les adresses des correspondants sont sur `exemple.nc`
 * ou `exemple.com` : aucune n'existe. Les dates sont relatives au moment du démarrage.
 */

export type GrainePJ = { nom: string; taille: number; type: string };

export type GraineMessage = {
  /** absent = message envoyé par la boîte */
  de?: { nom: string; adresse: string; prenom?: string };
  /** nom affiché pour un message sortant (par défaut : le commerce) */
  signataire?: string;
  quand: Date;
  texte: string;
  html?: string;
  pj?: GrainePJ[];
};

export type GraineConversation = {
  id: string;
  boite: string;
  objet: string;
  libelles?: string[];
  lu?: boolean;
  suivi?: boolean;
  indesirable?: boolean;
  aTrier?: boolean;
  /** verdict de Jev ; absent = mail arrivé directement sur l'adresse de la boîte */
  verdict?: {
    boiteId: string | null;
    confiance: number;
    raison: string;
    libelles?: string[];
    indesirable?: boolean;
  };
  messages: GraineMessage[];
  ia: ResumeIA;
};

export type GraineCommerce = {
  /** brouillon proposé quand l'IA n'a pas de contexte */
  generique: string;
  /** phrase de fin du ton « chaleureux » */
  chaleureux: string;
  conversations: GraineConversation[];
  bloques: string[];
  confiance: string[];
};

const MIN = 60_000;
const NOUMEA = 11 * 60 * MIN; // UTC+11, sans heure d'été

/** Il y a `minutes` minutes. */
function ilYa(minutes: number): Date {
  return new Date(Date.now() - minutes * MIN);
}

/** Jour `j` (≤ -1 : passé) à `hh:mm`, heure de Nouméa. */
function jour(j: number, hh: number, mm: number): Date {
  const maintenant = Date.now() + NOUMEA;
  const minuit = Math.floor(maintenant / 86_400_000) * 86_400_000;
  return new Date(minuit + j * 86_400_000 + (hh * 60 + mm) * MIN - NOUMEA);
}

const PDF = "application/pdf";

// ---------------------------------------------------------------------------
// Salon Opaline : données de la maquette (Main.dc.html)
// ---------------------------------------------------------------------------

const opaline: GraineCommerce = {
  generique:
    "Bonjour,\n\nMerci pour votre message. Je reviens vers vous très vite avec une réponse précise.\n\nBelle journée,",
  chaleureux: "Au plaisir de vous retrouver très vite au salon !",
  bloques: ["promo@offres-exclusives.exemple.com", "alerte@securite-compte.exemple.com"],
  confiance: [
    "commandes@pacific-beaute.exemple.nc",
    "contact@cabinet-centre.exemple.nc",
    "bureau@commercants.exemple.nc",
  ],
  conversations: [
    {
      id: "o1",
      boite: "accueil",
      objet: "Décaler mon rendez-vous de samedi ?",
      libelles: ["rdv"],
      lu: false,
      verdict: { boiteId: "accueil", confiance: 0.9, raison: "Changement de rendez-vous.", libelles: ["rdv"] },
      messages: [
        {
          de: { nom: "Léa Martin", prenom: "Léa", adresse: "lea.martin@exemple.nc" },
          quand: jour(-6, 18, 20),
          texte:
            "Bonjour,\n\nJe voudrais réserver une coupe et une couleur avec Clara, de préférence un samedi matin. Avez-vous de la place le 25 ?\n\nMerci,\nLéa",
        },
        {
          signataire: "Clara Moreau",
          quand: jour(-5, 9, 5),
          texte:
            "Bonjour Léa,\n\nC’est noté : samedi 25 octobre à 9 h avec Clara, coupe et couleur. Comptez environ 2 h 30.\n\nÀ samedi !\nClara",
        },
        {
          de: { nom: "Léa Martin", prenom: "Léa", adresse: "lea.martin@exemple.nc" },
          quand: jour(-5, 9, 40),
          texte: "Parfait, merci beaucoup ! À samedi.\nLéa",
        },
        {
          de: { nom: "Léa Martin", prenom: "Léa", adresse: "lea.martin@exemple.nc" },
          quand: ilYa(38),
          texte:
            "Bonjour,\n\nUn imprévu au travail m’oblige à décaler mon rendez-vous de samedi 9 h. Est-ce qu’un créneau serait possible samedi après-midi, vers 14 h ?\n\nMerci et désolée,\nLéa",
        },
      ],
      ia: {
        points: [
          "Léa a un rendez-vous coupe et couleur samedi 25 octobre à 9 h avec Clara, confirmé le 17 octobre.",
          "Elle demande à le déplacer samedi après-midi, vers 14 h.",
        ],
        aFaire: "vérifier le planning de samedi après-midi et lui répondre.",
        suggestions: [
          { libelle: "Accepter 14 h", brouillon: "Bonjour Léa,\n\nAucun souci : votre rendez-vous est déplacé à samedi 25 octobre à 14 h, toujours avec Clara.\n\nÀ samedi !" },
          { libelle: "Proposer 15 h 30", brouillon: "Bonjour Léa,\n\n14 h est déjà pris, mais Clara peut vous recevoir samedi à 15 h 30. Est-ce que cela vous convient ?\n\nBelle journée," },
          { libelle: "Proposer un autre jour", brouillon: "Bonjour Léa,\n\nSamedi après-midi est complet. Nous pouvons vous proposer mercredi 29 à 10 h ou vendredi 31 à 14 h. Dites-nous ce qui vous arrange.\n\nÀ bientôt," },
        ],
      },
    },
    {
      id: "o2",
      boite: "accueil",
      objet: "Votre commande n° 4821 est expédiée",
      libelles: ["fournisseur"],
      lu: false,
      verdict: { boiteId: "accueil", confiance: 0.97, raison: "Expéditeur connu : Pacific Beauté.", libelles: ["fournisseur"] },
      messages: [
        {
          signataire: "Clara Moreau",
          quand: jour(-2, 10, 12),
          texte: "Bonjour,\n\nPouvez-vous nous confirmer la date de livraison de la commande n° 4821 ?\n\nMerci,\nClara",
        },
        {
          de: { nom: "Pacific Beauté Distribution", adresse: "commandes@pacific-beaute.exemple.nc" },
          quand: ilYa(125),
          texte:
            "Bonjour,\n\nVotre commande n° 4821 (colorations, soins et deux cartons de serviettes) a quitté notre entrepôt ce matin. Livraison prévue jeudi entre 8 h et 12 h.\n\nLe bon de livraison est joint à ce message.\n\nL’équipe Pacific Beauté Distribution",
          pj: [{ nom: "Bon-de-livraison-4821.pdf", taille: 184_000, type: PDF }],
        },
      ],
      ia: {
        points: ["La commande n° 4821 (colorations, soins, serviettes) est partie ce matin.", "Livraison prévue jeudi entre 8 h et 12 h ; le bon de livraison est joint."],
        aFaire: "prévoir quelqu’un au salon jeudi matin pour réceptionner.",
        suggestions: [
          { libelle: "Remercier", brouillon: "Bonjour,\n\nMerci pour l’information, nous serons au salon jeudi matin pour réceptionner la commande.\n\nBonne journée," },
          { libelle: "Demander un créneau précis", brouillon: "Bonjour,\n\nMerci ! Pourriez-vous nous indiquer un créneau plus précis pour jeudi ? Le salon ouvre à 9 h.\n\nBonne journée," },
        ],
      },
    },
    {
      id: "o3",
      boite: "accueil",
      objet: "Tarifs pour un mariage, 6 personnes",
      libelles: ["client"],
      lu: false,
      verdict: { boiteId: "accueil", confiance: 0.86, raison: "Demande de devis d’un particulier.", libelles: ["client"] },
      messages: [
        {
          de: { nom: "Hugo Lefèvre", prenom: "Hugo", adresse: "hugo.lefevre@exemple.nc" },
          quand: jour(-1, 19, 6),
          texte:
            "Bonjour,\n\nNous nous marions le 14 décembre et nous cherchons un salon pour coiffer la mariée, sa mère et quatre témoins, le matin même. Proposez-vous ce type de forfait, et à quel tarif ?\n\nBien cordialement,\nHugo Lefèvre",
        },
      ],
      ia: {
        points: ["Mariage le 14 décembre : coiffure de la mariée, de sa mère et de quatre témoins, le matin.", "Hugo demande si un forfait existe et son tarif."],
        aFaire: "envoyer un devis de groupe.",
        suggestions: [
          { libelle: "Envoyer un devis", brouillon: "Bonjour Hugo,\n\nFélicitations pour votre mariage ! Nous proposons un forfait pour les groupes ; je vous prépare un devis pour six personnes le 14 décembre au matin et vous l’envoie sous 48 h.\n\nÀ très bientôt," },
          { libelle: "Proposer un essai", brouillon: "Bonjour Hugo,\n\nAvec plaisir ! Pour la mariée, nous conseillons un essai coiffure quelques semaines avant. Voulez-vous que nous fixions une date ?\n\nBelle journée," },
        ],
      },
    },
    {
      id: "o4",
      boite: "accueil",
      objet: "Facture de septembre",
      libelles: ["facture"],
      lu: true,
      verdict: { boiteId: "accueil", confiance: 0.98, raison: "Expéditeur connu : cabinet comptable.", libelles: ["facture"] },
      messages: [
        {
          de: { nom: "Cabinet Comptable du Centre", adresse: "contact@cabinet-centre.exemple.nc" },
          quand: jour(-1, 11, 30),
          texte:
            "Bonjour Clara,\n\nVous trouverez ci-joint la facture de tenue de comptabilité de septembre. Elle est payable sous 30 jours.\n\nBien à vous,\nCabinet Comptable du Centre",
          pj: [{ nom: "Facture-septembre.pdf", taille: 96_000, type: PDF }],
        },
      ],
      ia: {
        points: ["Facture de tenue de comptabilité de septembre, payable sous 30 jours."],
        aFaire: "la transmettre pour paiement.",
        suggestions: [{ libelle: "Accuser réception", brouillon: "Bonjour,\n\nBien reçu, merci. Le règlement sera fait dans les délais.\n\nBonne journée," }],
      },
    },
    {
      id: "o5",
      boite: "accueil",
      objet: "Merci pour samedi !",
      libelles: ["client"],
      lu: true,
      suivi: true,
      messages: [
        {
          de: { nom: "Inès Robert", prenom: "Inès", adresse: "ines.robert@exemple.nc" },
          quand: jour(-3, 18, 12),
          texte:
            "Bonjour à toute l’équipe,\n\nJe voulais vous remercier : ma coupe est exactement ce que je voulais, et j’ai reçu plein de compliments ce week-end. Je reviendrai sans faute pour la couleur en novembre.\n\nInès",
        },
        { signataire: "Clara Moreau", quand: jour(-3, 19, 2), texte: "Merci Inès, ça nous fait très plaisir ! À très vite pour la couleur.\nClara" },
      ],
      ia: {
        points: ["Inès remercie l’équipe pour sa coupe et reviendra en novembre pour une couleur.", "Clara lui a déjà répondu."],
        aFaire: null,
        suggestions: [
          { libelle: "Proposer un rendez-vous en novembre", brouillon: "Bonjour Inès,\n\nPour votre couleur, nous avons de la place le samedi 8 ou le mercredi 12 novembre. Voulez-vous que je vous réserve un créneau ?\n\nÀ bientôt," },
        ],
      },
    },
    {
      id: "o6",
      boite: "accueil",
      objet: "Marché de nuit du 7 novembre",
      lu: true,
      messages: [
        {
          de: { nom: "Association des commerçants", adresse: "bureau@commercants.exemple.nc" },
          quand: jour(-3, 9, 0),
          texte:
            "Bonjour à tous,\n\nLes inscriptions pour tenir un stand au marché de nuit du 7 novembre sont ouvertes jusqu’au 31 octobre. Répondez simplement à ce message pour réserver votre emplacement.\n\nLe bureau de l’association",
        },
      ],
      ia: {
        points: ["Stands du marché de nuit du 7 novembre : inscriptions ouvertes jusqu’au 31 octobre."],
        aFaire: "répondre avant le 31 octobre si le salon veut un stand.",
        suggestions: [
          { libelle: "Réserver un stand", brouillon: "Bonjour,\n\nLe Salon Opaline souhaite réserver un stand pour le marché de nuit du 7 novembre.\n\nMerci et à bientôt," },
          { libelle: "Décliner", brouillon: "Bonjour,\n\nMerci pour l’invitation ; nous ne pourrons pas tenir de stand cette fois-ci.\n\nBelle soirée à tous," },
        ],
      },
    },
    {
      id: "sp1",
      boite: "accueil",
      objet: "Votre compte sera suspendu sous 24 h",
      indesirable: true,
      lu: false,
      verdict: { boiteId: "accueil", confiance: 0.98, indesirable: true, raison: "Faux message de banque avec un lien vers un site imité." },
      messages: [
        {
          de: { nom: "Service Sécurité Bancaire", adresse: "alerte@securite-compte.exemple.com" },
          quand: ilYa(220),
          texte:
            "Cher client,\n\nUne activité inhabituelle a été détectée sur votre compte. Pour éviter sa suspension, confirmez vos informations sous 24 h en cliquant sur le lien ci-dessous.\n\nLe service sécurité",
        },
      ],
      ia: { points: ["Message frauduleux : il imite une banque et pousse à cliquer sur un lien.", "Ne cliquez sur rien et ne répondez pas."], aFaire: null, suggestions: [] },
    },
    {
      id: "sp2",
      boite: "accueil",
      objet: "Vous avez gagné un séjour de rêve !",
      indesirable: true,
      lu: true,
      verdict: { boiteId: "accueil", confiance: 0.95, indesirable: true, raison: "Publicité envoyée en masse par un expéditeur inconnu." },
      messages: [
        {
          de: { nom: "Offres Exclusives", adresse: "promo@offres-exclusives.exemple.com" },
          quand: jour(-1, 22, 14),
          texte:
            "Félicitations !\n\nVous faites partie des gagnants de notre grand tirage. Pour réclamer votre séjour, il suffit de régler les frais de dossier.\n\nL’équipe Offres Exclusives",
        },
      ],
      ia: { points: ["Publicité trompeuse : le « gain » demande de payer des frais."], aFaire: null, suggestions: [] },
    },
  ],
};

/** Graines versionnées : seulement le commerce fictif de la maquette. */
export const GRAINES: Record<string, () => GraineCommerce> = {
  opaline: () => opaline,
};

/**
 * Graines des vrais commerces, hors dépôt (décision Marco du 22/10 : le dépôt public ne
 * montre aucun client). Fichier `<BOITE_DEMO_DOSSIER>/<slug>.json`, dates relatives en
 * `ilYaMinutes` ; en développement, à défaut : `config/demo` (ignoré par git).
 */
export function graineDepuisFichier(slug: string): GraineCommerce | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const dossier = process.env.BOITE_DEMO_DOSSIER || (process.env.NODE_ENV === "production" ? "" : "config/demo");
  if (!dossier) return null;
  try {
    const brut = JSON.parse(readFileSync(path.resolve(dossier, `${slug}.json`), "utf8")) as Omit<GraineCommerce, "conversations"> & {
      conversations: (Omit<GraineConversation, "messages"> & { messages: (Omit<GraineMessage, "quand"> & { ilYaMinutes: number })[] })[];
    };
    return {
      ...brut,
      conversations: brut.conversations.map((c) => ({
        ...c,
        messages: c.messages.map(({ ilYaMinutes, ...m }) => ({ ...m, quand: ilYa(ilYaMinutes) })),
      })),
    };
  } catch {
    return null;
  }
}
