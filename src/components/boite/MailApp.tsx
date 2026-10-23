"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { chargerConversationAvecImages, chargerListe, modifierConversations, ouvrirConversation } from "@/app/actions";
import type {
  Conversation,
  Capacites,
  EtatBoites,
  ModificationConversation,
  Parametres,
  PieceJointe,
  ResumeConversation,
  ResumeIA,
  Vue,
} from "@/lib/mail/types";
import { appliquer, dansVue, inverse } from "@/lib/mail/vues";
import { Icone } from "../Icone";
import {
  Avatar,
  BoutonIcone,
  gestionnairesDepot,
  useEcranLarge,
  Vide,
  type CommerceClient,
  type Depot,
  type EtatGlisse,
  type UtilisateurClient,
} from "./commun";
import { Lecture, type ActionsLecture } from "./Lecture";
import { Ligne, type Balayage } from "./Ligne";
import { MenuDeplacer, type Destination } from "./MenuDeplacer";
import { DOSSIERS, EnTeteCommerce, Navigation } from "./Navigation";
import { Redaction, type EtatRedaction } from "./Redaction";
import { groupeDe } from "./outils";

type Mode = "clair" | "sombre" | "auto";
type Toast = { id: number; texte: string; annuler?: () => void };
type Changement = { id: string; mod: ModificationConversation };

const COOKIE_AFFICHAGE = "boite_affichage";

function useSystemeSombre(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

export function appliquerMode(m: Mode) {
  document.documentElement.dataset.mode = m;
  document.cookie = `${COOKIE_AFFICHAGE}=${m}; path=/; max-age=31536000; samesite=lax`;
}

const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? `${n} ${plusieurs}` : un);

export function MailApp({
  commerce,
  utilisateur,
  etatInitial,
  listeInitiale,
  vueInitiale,
  parametres,
  capacites,
  modeInitial,
}: {
  commerce: CommerceClient;
  utilisateur: UtilisateurClient;
  etatInitial: EtatBoites;
  listeInitiale: ResumeConversation[];
  vueInitiale: Vue;
  parametres: Parametres;
  capacites: Capacites;
  modeInitial: Mode;
}) {
  const large = useEcranLarge();
  const systemeSombre = useSystemeSombre();
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [etat, setEtat] = useState(etatInitial);
  const [liste, setListe] = useState(listeInitiale);
  const [requete, setRequete] = useState("");
  const [filtre, setFiltre] = useState<string>("tous");
  const [selId, setSelId] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<{ conversation: Conversation; ia: ResumeIA | null } | null>(null);
  const [panneau, setPanneau] = useState<"liste" | "conversation">("liste");
  const [coches, setCoches] = useState<string[]>([]);
  const [redaction, setRedaction] = useState<EtatRedaction | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [glisse, setGlisse] = useState<EtatGlisse>({ charge: null, survol: null });
  const [menu, setMenu] = useState<{ ids: string[]; seulement?: "boites" | "libelles" } | null>(null);
  const [tiroir, setTiroir] = useState(false);
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [chargement, demarrer] = useTransition();
  const demande = useRef(0);
  const demandeOuverture = useRef(0);
  const minuteurRecherche = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sombre = mode === "sombre" || (mode === "auto" && systemeSombre);
  const plusieursBoites = commerce.boites.length > 1;
  const nomBoite = (id: string) => commerce.boites.find((b) => b.id === id)?.libelle ?? "";
  const nomLibelle = (id: string) => commerce.libelles.find((l) => l.id === id)?.nom ?? "";
  const boiteParDefaut = () =>
    vue.type === "boite" ? vue.id : (etat.boites.find((b) => b.accueil) ?? etat.boites[0])?.id ?? commerce.boites[0].id;

  // --- Messages éphémères (disparaissent seuls, sauf survol ou focus) ---
  const [toastEnPause, setToastEnPause] = useState(false);
  const fermerToast = () => setToast(null);
  const dire = (texte: string, annuler?: () => void) => setToast((t) => ({ id: (t?.id ?? 0) + 1, texte, annuler }));
  useEffect(() => {
    if (!toast || toastEnPause) return;
    const m = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.annuler ? 7000 : 4500);
    return () => clearTimeout(m);
  }, [toast, toastEnPause]);
  useEffect(
    () => () => {
      if (minuteurRecherche.current) clearTimeout(minuteurRecherche.current);
    },
    [],
  );

  const erreur = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Une erreur est survenue.";
    if (/session/i.test(msg)) {
      window.location.assign("/connexion");
      return;
    }
    dire(msg);
  };

  // --- Données ---
  const recharger = (v: Vue = vue, q: string = requete) => {
    const n = ++demande.current;
    demarrer(async () => {
      try {
        const page = await chargerListe({ vue: v, q });
        if (n === demande.current) setListe(page.conversations);
      } catch (e) {
        erreur(e);
      }
    });
  };

  const changerVue = (v: Vue) => {
    setVue(v);
    setCoches([]);
    setTiroir(false);
    setPanneau("liste");
    setFiltre("tous");
    setSelId(null);
    setOuverte(null);
    recharger(v, requete);
  };

  const chercher = (q: string) => {
    setRequete(q);
    if (minuteurRecherche.current) clearTimeout(minuteurRecherche.current);
    minuteurRecherche.current = setTimeout(() => recharger(vue, q), 250);
  };

  const ouvrir = async (id: string) => {
    setSelId(id);
    setPanneau("conversation");
    setListe((l) => l.map((c) => (c.id === id ? { ...c, lu: true } : c)));
    const n = ++demandeOuverture.current;
    try {
      const r = await ouvrirConversation(id);
      if (n !== demandeOuverture.current) return;
      setOuverte({ conversation: r.conversation, ia: r.ia });
      setEtat(r.etat);
    } catch (e) {
      erreur(e);
    }
  };

  const chargerImages = async (id: string) => {
    try { const conversation = { ...(await chargerConversationAvecImages(id)), imagesDistantesAutorisees: true }; setOuverte(v => v?.conversation.id === id ? { ...v, conversation } : v); }
    catch (e) { erreur(e); }
  };

  const trouver = (id: string): ResumeConversation | undefined =>
    liste.find((c) => c.id === id) ?? (ouverte?.conversation.id === id ? ouverte.conversation : undefined);

  /** Applique des modifications : à l'écran tout de suite, puis côté serveur. */
  const modifier = async (changements: Changement[], texte?: string, avecAnnuler = true) => {
    const precedents = changements
      .map((ch) => ({ ch, avant: trouver(ch.id) }))
      .filter((x): x is { ch: Changement; avant: ResumeConversation } => !!x.avant);
    const parId = new Map(changements.map((c) => [c.id, c.mod]));
    setListe((l) => l.map((c) => (parId.has(c.id) ? appliquer(c, parId.get(c.id)!) : c)).filter((c) => dansVue(c, vue)));
    if (ouverte && parId.has(ouverte.conversation.id)) {
      const maj = { ...ouverte.conversation, ...appliquer(ouverte.conversation, parId.get(ouverte.conversation.id)!) };
      setOuverte({ ...ouverte, conversation: maj });
      if (!dansVue(maj, vue) && !large) setPanneau("liste");
    }
    setCoches([]);
    try {
      let dernier: EtatBoites | null = null;
      for (const ch of changements) {
        const r = await modifierConversations([ch.id], ch.mod);
        dernier = r.etat;
      }
      if (dernier) setEtat(dernier);
      if (texte) {
        dire(
          texte,
          avecAnnuler
            ? async () => {
                fermerToast();
                try {
                  let e: EtatBoites | null = null;
                  for (const { ch, avant } of precedents) e = (await modifierConversations([ch.id], inverse(avant, ch.mod))).etat;
                  if (e) setEtat(e);
                  if (ouverte && precedents.some((p) => p.ch.id === ouverte.conversation.id)) {
                    const p = precedents.find((x) => x.ch.id === ouverte.conversation.id)!;
                    setOuverte({ ...ouverte, conversation: { ...ouverte.conversation, ...p.avant, messages: ouverte.conversation.messages } });
                  }
                  recharger();
                } catch (err) {
                  erreur(err);
                }
              }
            : undefined,
        );
      }
    } catch (e) {
      erreur(e);
      recharger();
    }
  };

  const tous = (ids: string[], mod: ModificationConversation) => ids.map((id) => ({ id, mod }));
  const enArriere = vue.type === "dossier" && (vue.id === "archives" || vue.id === "corbeille" || vue.id === "indesirables");

  const archiver = (ids: string[]) => {
    const deja = ids.every((id) => trouver(id)?.archive);
    modifier(
      tous(ids, { archive: !deja }),
      deja
        ? pluriel(ids.length, "Conversation remise dans sa boîte", "conversations remises dans leur boîte")
        : pluriel(ids.length, "Conversation archivée", "conversations archivées"),
    );
  };
  const supprimer = (ids: string[]) => {
    if (!capacites.corbeille) return;
    const deja = ids.every((id) => trouver(id)?.supprime);
    modifier(
      tous(ids, { supprime: !deja }),
      deja
        ? pluriel(ids.length, "Conversation retirée de la corbeille", "conversations retirées de la corbeille")
        : pluriel(ids.length, "Conversation placée dans la corbeille", "conversations placées dans la corbeille"),
    );
  };
  const indesirable = (ids: string[], valeur: boolean) => {
    const c0 = trouver(ids[0]);
    modifier(
      tous(ids, { indesirable: valeur }),
      valeur
        ? ids.length === 1 && c0?.correspondant
          ? `Signalée comme spam : les prochains messages de ${c0.correspondant.nom} iront dans Indésirables.`
          : pluriel(ids.length, "Conversation signalée comme spam", "conversations signalées comme spam")
        : pluriel(ids.length, "Ce n’est pas un spam : conversation remise dans sa boîte.", "conversations remises dans leur boîte"),
    );
  };
  const marquerLu = (ids: string[], valeur: boolean) =>
    modifier(
      tous(ids, { lu: valeur }),
      ids.length === 1 ? (valeur ? "Marquée comme lue" : "Marquée comme non lue") : `${ids.length} conversations marquées comme ${valeur ? "lues" : "non lues"}`,
    );
  const basculerSuivi = (id: string) => {
    if (!capacites.suivis) return;
    const c = trouver(id);
    if (c) modifier([{ id, mod: { suivi: !c.suivi } }]);
  };

  const ajouterLibelle = (ids: string[], lib: string) =>
    modifier(
      ids.map((id) => ({ id, mod: { libelles: [...new Set([...(trouver(id)?.libelles ?? []), lib])] } })),
      `${pluriel(ids.length, "Classée", "conversations classées")} dans ${nomLibelle(lib)}.`,
    );

  const deplacerVers = (ids: string[], d: Destination) => {
    setMenu(null);
    if (d.type === "boite") {
      const corrige = ids.some((id) => trouver(id)?.verdict);
      modifier(
        tous(ids, { boiteId: d.id, archive: false, ...(capacites.corbeille ? { supprime: false } : {}), indesirable: false }),
        `${pluriel(ids.length, "Rangée", "conversations rangées")} dans ${nomBoite(d.id)}.${corrige ? " Jev apprendra de votre choix." : ""}`,
      );
    } else if (d.type === "libelle") {
      const tousOnt = ids.every((id) => trouver(id)?.libelles.includes(d.id));
      if (tousOnt) {
        modifier(
          ids.map((id) => ({ id, mod: { libelles: (trouver(id)?.libelles ?? []).filter((l) => l !== d.id) } })),
          `Libellé ${nomLibelle(d.id)} retiré.`,
        );
      } else ajouterLibelle(ids, d.id);
    } else if (d.id === "reception") {
      modifier(tous(ids, { archive: false, ...(capacites.corbeille ? { supprime: false } : {}), indesirable: false }), pluriel(ids.length, "Conversation remise dans sa boîte", "conversations remises dans leur boîte"));
    } else if (d.id === "suivis") {
      modifier(tous(ids, { suivi: true }), pluriel(ids.length, "Conversation ajoutée aux suivis", "conversations ajoutées aux suivis"));
    } else if (d.id === "archives") {
      modifier(tous(ids, { archive: true }), pluriel(ids.length, "Conversation archivée", "conversations archivées"));
    } else if (d.id === "indesirables") {
      indesirable(ids, true);
    } else if (d.id === "corbeille") {
      modifier(tous(ids, { supprime: true }), pluriel(ids.length, "Conversation placée dans la corbeille", "conversations placées dans la corbeille"));
    }
  };

  // --- Rédaction ---
  const nouvelle = (patch: Partial<EtatRedaction> = {}) =>
    setRedaction({
      mode: "nouveau",
      boiteId: boiteParDefaut(),
      a: "",
      objet: "",
      corps: "",
      fichiers: [],
      references: [],
      consigne: "",
      note: "",
      prenom: "",
      ...patch,
    });

  const boiteEnvoi = (id: string) => (etat.boites.some((b) => b.id === id) ? id : boiteParDefaut());

  const repondre = (c: Conversation, brouillon?: string, note?: string) => {
    const corr = c.correspondant;
    const prenom = corr?.prenom ?? "";
    nouvelle({
      mode: "reponse",
      conversationId: c.id,
      boiteId: boiteEnvoi(c.boiteId),
      a: corr ? `${corr.nom} <${corr.adresse}>` : "",
      objet: c.objet.startsWith("Re : ") ? c.objet : `Re : ${c.objet}`,
      corps: brouillon ?? (prenom ? `Bonjour ${prenom},\n\n` : "Bonjour,\n\n"),
      note: note ?? "",
      prenom,
    });
  };

  const transferer = (c: Conversation) => {
    const dernier = c.messages[c.messages.length - 1];
    nouvelle({
      mode: "transfert",
      boiteId: boiteEnvoi(c.boiteId),
      objet: `Tr : ${c.objet}`,
      corps: `\n\n— Message transféré —\nDe : ${dernier.de.nom} <${dernier.de.adresse}>\nObjet : ${c.objet}\n\n${dernier.texte}`,
      references: capacites.piecesJointesSortantes ? dernier.piecesJointes.map((p) => ({ id: p.id, nom: p.nom, taille: p.taille })) : [],
    });
  };

  const transfererParId = async (id: string) => {
    try {
      const r = ouverte?.conversation.id === id ? ouverte : await ouvrirConversation(id);
      transferer(r.conversation);
    } catch (e) {
      erreur(e);
    }
  };

  // --- Glisser-déposer ---
  const debutGlisseConversation = (e: React.DragEvent, c: ResumeConversation) => {
    const ids = coches.includes(c.id) ? coches : [c.id];
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("text/plain", c.objet);
    setTimeout(() => setGlisse({ charge: { type: "conversation", ids }, survol: null }), 0);
  };
  const debutGlissePiece = (e: React.DragEvent, p: PieceJointe) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", p.nom);
    setTimeout(() => setGlisse({ charge: { type: "piece", id: p.id, nom: p.nom, taille: p.taille, mime: p.type }, survol: null }), 0);
  };
  const finGlisse = () => setGlisse({ charge: null, survol: null });

  const depotPour = (v: Vue): Depot | null => {
    const cle = `${v.type}:${"id" in v ? v.id : ""}`;
    const conv = (c: EtatGlisse["charge"]) => c?.type === "conversation";
    if (v.type === "boite")
      return { cle, accepte: conv, surDepot: (c) => c?.type === "conversation" && deplacerVers(c.ids, { type: "boite", id: v.id }) };
    if (v.type === "libelle")
      return { cle, accepte: conv, surDepot: (c) => c?.type === "conversation" && ajouterLibelle(c.ids, v.id) };
    if (v.type === "dossier" && (v.id === "suivis" || v.id === "archives" || v.id === "indesirables" || v.id === "corbeille")) {
      const id = v.id;
      return { cle, accepte: conv, surDepot: (c) => c?.type === "conversation" && deplacerVers(c.ids, { type: "dossier", id }) };
    }
    return null;
  };

  const depotEcrire: Depot = {
    cle: "ecrire",
    accepte: (c, fichiers) => capacites.piecesJointesSortantes && (fichiers || !!c),
    surDepot: (c, fichiers) => {
      if (c?.type === "conversation") transfererParId(c.ids[0]);
      else if (c?.type === "piece") nouvelle({ references: [{ id: c.id, nom: c.nom, taille: c.taille }] });
      else if (fichiers.length) nouvelle({ fichiers });
    },
  };
  const libelleEcrire =
    glisse.charge?.type === "piece" ? "Déposer pour joindre" : glisse.charge?.type === "conversation" ? "Déposer pour transférer" : "Écrire";

  const basculerMode = () => {
    const m: Mode = sombre ? "clair" : "sombre";
    setMode(m);
    appliquerMode(m);
  };

  // --- Liste affichée ---
  const filtrees = liste.filter((c) =>
    filtre === "nonlus" ? !c.lu : filtre === "pj" ? c.nbPiecesJointes > 0 : filtre.startsWith("lib:") ? c.libelles.includes(filtre.slice(4)) : true,
  );
  const groupes: { cle: string; libelle: string; items: ResumeConversation[] }[] = [];
  for (const c of filtrees) {
    const g = groupeDe(c.derniereDate, commerce.fuseau);
    const dernier = groupes[groupes.length - 1];
    if (dernier?.cle === g.cle) dernier.items.push(c);
    else groupes.push({ ...g, items: [c] });
  }

  const titre =
    vue.type === "boite"
      ? nomBoite(vue.id)
      : vue.type === "aTrier"
        ? "À trier"
        : vue.type === "libelle"
          ? nomLibelle(vue.id)
          : (DOSSIERS.find((d) => d.id === vue.id)?.nom ?? "");
  const boiteVue = vue.type === "boite" ? etat.boites.find((b) => b.id === vue.id) : undefined;
  const sousTitre = boiteVue
    ? boiteVue.nonLus
      ? `${boiteVue.nonLus} non ${boiteVue.nonLus > 1 ? "lues" : "lue"}`
      : "Tout est lu"
    : `${liste.length} conversation${liste.length > 1 ? "s" : ""}`;
  const premierLibelle = commerce.libelles[0];
  const filtres = [
    { cle: "tous", nom: "Tous" },
    { cle: "nonlus", nom: "Non lus" },
    { cle: "pj", nom: "Pièces jointes" },
    ...(premierLibelle ? [{ cle: `lib:${premierLibelle.id}`, nom: premierLibelle.nom }] : []),
  ];
  const texteVide = requete.trim()
    ? `Aucune conversation ne correspond à « ${requete.trim()} ».`
    : vue.type === "aTrier"
      ? "Rien à trier : Jev a rangé tous les mails."
      : "Rien ici pour le moment.";

  const gaucheCourt: Balayage = enArriere ? "remettre" : "archiver";
  const gaucheLong: Balayage = !capacites.corbeille || (vue.type === "dossier" && vue.id === "corbeille") ? "remettre" : "supprimer";
  const balayer = (c: ResumeConversation, a: Balayage) => {
    if (a === "lu") marquerLu([c.id], !c.lu);
    else if (a === "archiver") archiver([c.id]);
    else if (a === "remettre") deplacerVers([c.id], { type: "dossier", id: "reception" });
    else supprimer([c.id]);
  };
  const tousLus = coches.length > 0 && coches.every((id) => trouver(id)?.lu);

  const conversationAffichee = ouverte && ouverte.conversation.id === selId ? ouverte : null;
  const actionsLecture: ActionsLecture = {
    onRetour: () => setPanneau("liste"),
    onArchiver: () => {
      if (ouverte) archiver([ouverte.conversation.id]);
    },
    onIndesirable: () => {
      if (ouverte) indesirable([ouverte.conversation.id], !ouverte.conversation.indesirable);
    },
    onSupprimer: () => {
      if (ouverte) supprimer([ouverte.conversation.id]);
    },
    onNonLu: () => {
      if (!ouverte) return;
      marquerLu([ouverte.conversation.id], false);
      if (!large) setPanneau("liste");
    },
    onSuivi: () => {
      if (ouverte) basculerSuivi(ouverte.conversation.id);
    },
    onDeplacer: (seulement?: "boites" | "libelles") => {
      if (ouverte) setMenu({ ids: [ouverte.conversation.id], seulement });
    },
    onRepondre: (b?: string, n?: string) => {
      if (ouverte) repondre(ouverte.conversation, b, n);
    },
    onTransferer: () => {
      if (ouverte) transferer(ouverte.conversation);
    },
    onGlisserPiece: debutGlissePiece,
    onGlisserFin: finGlisse,
  };

  const menuIds = menu?.ids ?? [];
  const libellesCommuns = commerce.libelles
    .filter((l) => menuIds.length > 0 && menuIds.every((id) => trouver(id)?.libelles.includes(l.id)))
    .map((l) => l.id);

  const boutonEcrire = (
    <BoutonEcrire depot={depotEcrire} glisse={glisse} setGlisse={setGlisse} onClick={() => nouvelle()}>
      {libelleEcrire}
    </BoutonEcrire>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-surface text-[14px] lg:grid lg:grid-cols-[248px_minmax(340px,420px)_minmax(0,1fr)] lg:gap-3 lg:bg-fond lg:p-3">
      <a
        href="#liste-conversations"
        className="sr-only-focusable fixed top-2 left-2 z-[60] rounded-xl bg-toast-fond px-4 py-3 font-bold text-toast-texte"
      >
        Aller à la liste des conversations
      </a>
      <p id="aide-glisser" className="sr-only">
        Glissez la conversation vers une boîte, un dossier ou un libellé, ou utilisez le bouton « Déplacer vers… ».
      </p>

      {/* Colonne de navigation (ordinateur) */}
      <nav aria-label="Navigation de la messagerie" className="hidden min-h-0 flex-col gap-4 px-1.5 pt-2.5 pb-1.5 lg:flex">
        <div className="px-1.5">
          <EnTeteCommerce commerce={commerce} />
        </div>
        <Navigation
          commerce={commerce}
          capacites={capacites}
          utilisateur={utilisateur}
          etat={etat}
          vue={vue}
          onVue={changerVue}
          depot={depotPour}
          glisse={glisse}
          setGlisse={setGlisse}
          sombre={sombre}
          onBasculerMode={basculerMode}
          ecrire={boutonEcrire}
        />
      </nav>

      {/* Liste des conversations */}
      <section
        aria-labelledby="titre-liste"
        className={`relative flex min-h-0 flex-1 flex-col bg-surface lg:overflow-hidden lg:rounded-[18px] lg:border lg:border-bordure ${
          panneau === "conversation" ? "max-lg:hidden" : ""
        }`}
      >
        {coches.length > 0 ? (
          <div role="toolbar" aria-label="Conversations sélectionnées" className="anim-fondu flex h-14 shrink-0 items-center gap-0.5 bg-selection px-1.5 lg:rounded-t-[18px]">
            <BoutonIcone icone="fermer" libelle="Quitter la sélection" onClick={() => setCoches([])} />
            <span aria-live="polite" className="min-w-0 flex-1 pl-1 text-[17px] font-bold tabular-nums">
              {coches.length} {coches.length > 1 ? "sélectionnées" : "sélectionnée"}
            </span>
            <BoutonIcone icone="courrier" libelle={tousLus ? "Marquer comme non lu" : "Marquer comme lu"} onClick={() => marquerLu(coches, !tousLus)} />
            <BoutonIcone icone={enArriere ? "remettre" : "archives"} libelle={enArriere ? "Remettre dans sa boîte" : "Archiver"} onClick={() => (enArriere ? deplacerVers(coches, { type: "dossier", id: "reception" }) : archiver(coches))} />
            {capacites.corbeille && <BoutonIcone icone="corbeille" libelle="Supprimer" onClick={() => supprimer(coches)} />}
            <BoutonIcone icone="deplacer" libelle="Déplacer vers…" onClick={() => setMenu({ ids: coches })} />
          </div>
        ) : (
          <div className="flex h-14 shrink-0 items-center gap-1.5 pr-2 pl-1.5 lg:hidden">
            <BoutonIcone icone="menu" libelle="Boîtes, dossiers et libellés" aria-expanded={tiroir} onClick={() => setTiroir(true)} taille={22} />
            <div className="min-w-0 flex-1">
              <EnTeteCommerce commerce={commerce} taille={34} />
            </div>
            {capacites.parametres && <Link href="/parametres" aria-label={`Paramètres de ${utilisateur.nom}`} className="flex size-11 shrink-0 items-center justify-center rounded-full">
              <Avatar nom={utilisateur.nom} taille={34} />
            </Link>}
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-3 px-4 pb-0.5 lg:border-b lg:border-bordure lg:px-[18px] lg:pt-[18px] lg:pb-3.5">
          <div className="hidden items-baseline justify-between gap-3 lg:flex">
            <h1 id={large ? "titre-liste" : undefined} className="m-0 text-[19px] font-bold">
              {titre}
            </h1>
            <span className="text-[12.5px] text-attenue">{sousTitre}</span>
          </div>
          <div role="search" className="relative">
            <label htmlFor="recherche" className="sr-only">
              Rechercher dans les mails
            </label>
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-attenue">
              <Icone nom="recherche" taille={17} epaisseur={2} />
            </span>
            <input
              id="recherche"
              type="search"
              autoComplete="off"
              value={requete}
              onChange={(e) => chercher(e.target.value)}
              placeholder="Rechercher un mail, un correspondant, un fichier…"
              className="h-[46px] w-full rounded-[14px] border border-bordure-forte bg-saisie pr-3 pl-11 text-[16px] text-texte placeholder:text-attenue lg:h-[42px] lg:rounded-xl lg:pl-[38px] lg:text-[14px]"
            />
          </div>
          <div role="group" aria-label="Filtrer les conversations" className="sans-barre -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {filtres.map((f) => {
              const actif = filtre === f.cle;
              return (
                <button key={f.cle} type="button" aria-pressed={actif} onClick={() => setFiltre(f.cle)} className="flex h-11 shrink-0 items-center">
                  <span
                    className={`flex h-[34px] items-center rounded-full border px-3.5 text-[13.5px] font-semibold whitespace-nowrap lg:h-8 lg:px-3 lg:text-[13px] ${
                      actif ? "border-encre-accent bg-encre-accent text-surface" : "border-bordure-forte text-texte"
                    }`}
                  >
                    {f.nom}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div id="liste-conversations" tabIndex={-1} className="sans-barre min-h-0 flex-1 overflow-y-auto overscroll-contain lg:px-0 lg:pt-1 lg:pb-3" aria-busy={chargement}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-3 lg:hidden">
            <h1 id={large ? undefined : "titre-liste"} className="m-0 text-[22px] font-bold tracking-[-0.01em]">
              {titre}
            </h1>
            <span className="shrink-0 text-[13px] text-attenue">{sousTitre}</span>
          </div>
          {groupes.length === 0 && <Vide>{chargement ? "Chargement…" : texteVide}</Vide>}
          {groupes.map((g) => (
            <section key={g.cle} aria-labelledby={`groupe-${g.cle}`}>
              <h2 id={`groupe-${g.cle}`} className="m-0 px-5 pt-3.5 pb-1.5 text-[13px] font-bold text-attenue lg:px-[18px] lg:text-[12px]">
                {g.libelle}
              </h2>
              <ul role="list" className="m-0 list-none p-0">
                {g.items.map((c) => (
                  <Ligne
                    key={c.id}
                    c={c}
                    commerce={commerce}
                    actif={c.id === selId && (large || panneau === "conversation")}
                    coche={coches.includes(c.id)}
                    modeSelection={coches.length > 0}
                    large={large}
                    montrerBoite={plusieursBoites && vue.type !== "boite"}
                    gaucheCourt={gaucheCourt}
                    gaucheLong={gaucheLong}
                    enGlisse={glisse.charge?.type === "conversation" && glisse.charge.ids.includes(c.id)}
                    onOuvrir={() => ouvrir(c.id)}
                    onCocher={() => setCoches((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                    onAppuiLong={() => setCoches((s) => (s.includes(c.id) ? s : [...s, c.id]))}
                    onSuivi={() => basculerSuivi(c.id)}
                    afficherSuivi={capacites.suivis}
                    onDeplacer={() => setMenu({ ids: coches.includes(c.id) ? coches : [c.id] })}
                    onBalayage={(a) => balayer(c, a)}
                    onGlisserDebut={(e) => debutGlisseConversation(e, c)}
                    onGlisserFin={finGlisse}
                  />
                ))}
              </ul>
            </section>
          ))}
          <p className="m-0 px-7 pt-[18px] pb-28 text-center text-[13px] leading-normal text-attenue lg:hidden">
            {coches.length > 0
              ? "Touchez d’autres conversations pour les ajouter à la sélection."
              : `Glissez une conversation vers la gauche pour l’archiver${capacites.corbeille ? ", plus loin pour la supprimer" : ""}, vers la droite pour la marquer comme lue. Appui long pour en choisir plusieurs.`}
          </p>
        </div>
        <p className="m-0 hidden border-t border-bordure px-[18px] pt-2.5 pb-3.5 text-[12.5px] leading-[1.45] text-attenue lg:block">
          {glisse.charge?.type === "conversation"
            ? "Déposez sur une boîte, un dossier ou un libellé. Sur « Écrire », la conversation est transférée."
            : "Astuce : glissez une conversation sur une boîte, un dossier ou un libellé pour la classer, ou une pièce jointe sur « Écrire » pour l’envoyer."}
        </p>

        {coches.length === 0 && (
          <button
            type="button"
            onClick={() => nouvelle()}
            className="absolute right-4 z-[4] flex h-14 items-center gap-2.5 rounded-[18px] bg-accent pr-[22px] pl-[18px] text-[15.5px] font-bold text-sur-accent shadow-[0_10px_26px_rgba(20,14,20,0.26)] transition-[bottom] duration-200 lg:hidden"
            style={{ bottom: `calc(${toast ? 76 : 16}px + env(safe-area-inset-bottom))` }}
          >
            <Icone nom="ecrire" taille={20} epaisseur={2} />
            Écrire
          </button>
        )}
      </section>

      {/* Lecture */}
      <div
        className={`flex min-h-0 flex-1 flex-col bg-surface lg:overflow-hidden lg:rounded-[18px] lg:border lg:border-bordure ${
          panneau === "liste" ? "max-lg:hidden" : "max-lg:anim-pousse"
        }`}
      >
        {conversationAffichee ? (
          <Lecture
            key={conversationAffichee.conversation.id}
            conversation={conversationAffichee.conversation}
            ia={conversationAffichee.ia}
            commerce={commerce}
            large={large}
            actions={actionsLecture}
            imagesParServeur={capacites.imagesParServeur}
            onChargerImages={() => chargerImages(conversationAffichee.conversation.id)}
            capacites={capacites}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center text-attenue">
            <Icone nom="courrier" taille={40} epaisseur={1.4} />
            <p className="m-0 text-[15px]">{selId ? "Ouverture de la conversation…" : "Choisissez une conversation pour la lire."}</p>
            {selId && (
              <button type="button" onClick={() => setPanneau("liste")} className="min-h-11 rounded-xl px-3 font-bold text-encre-accent underline lg:hidden">
                Retour à la liste
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tiroir (téléphone) */}
      {tiroir && !large && (
        <Tiroir onFermer={() => setTiroir(false)}>
          <div className="flex items-center gap-3 pt-4 pr-2 pb-3 pl-[18px]">
            <div className="min-w-0 flex-1">
              <EnTeteCommerce commerce={commerce} />
            </div>
            <BoutonIcone icone="fermer" libelle="Fermer le menu" onClick={() => setTiroir(false)} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-[max(16px,env(safe-area-inset-bottom))]">
            <Navigation
              commerce={commerce}
              capacites={capacites}
              utilisateur={utilisateur}
              etat={etat}
              vue={vue}
              onVue={changerVue}
              depot={() => null}
              glisse={glisse}
              setGlisse={setGlisse}
              sombre={sombre}
              onBasculerMode={basculerMode}
              tiroir
            />
          </div>
        </Tiroir>
      )}

      {redaction && (
        <Redaction
          r={redaction}
          large={large}
          onChange={(patch) => setRedaction((r) => (r ? { ...r, ...patch } : r))}
          onFermer={() => setRedaction(null)}
          onEnvoye={(c, e, texte) => {
            setRedaction(null);
            setEtat(e);
            if (ouverte?.conversation.id === c.id) setOuverte({ conversation: c, ia: ouverte.ia });
            dire(texte);
            recharger();
          }}
          boites={etat.boites}
          parametres={parametres}
          capacites={capacites}
          glisse={glisse}
          setGlisse={setGlisse}
        />
      )}

      {menu && (
        <MenuDeplacer
          commerce={commerce}
          nombre={menu.ids.length}
          seulement={menu.seulement}
          libellesActifs={libellesCommuns}
          boiteActuelle={menu.ids.length === 1 ? (trouver(menu.ids[0])?.boiteId ?? null) : null}
          capacites={capacites}
          onChoisir={(d) => deplacerVers(menu.ids, d)}
          onFermer={() => setMenu(null)}
        />
      )}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 z-50 flex justify-start lg:inset-x-auto lg:left-7"
        style={{ bottom: `calc(${redaction && !large ? 12 : large ? 28 : 12}px + env(safe-area-inset-bottom))` }}
      >
        {toast && (
          <div
            key={toast.id}
            onMouseEnter={() => setToastEnPause(true)}
            onMouseLeave={() => setToastEnPause(false)}
            onFocus={() => setToastEnPause(true)}
            onBlur={() => setToastEnPause(false)}
            className="anim-monte pointer-events-auto flex min-h-12 w-full max-w-[560px] items-center gap-2 rounded-[14px] bg-toast-fond py-1.5 pr-1.5 pl-4 text-[14.5px] leading-[1.35] font-semibold text-toast-texte shadow-[0_12px_32px_rgba(20,14,20,0.28)] lg:w-auto lg:rounded-xl lg:text-[14px]"
          >
            <span className="min-w-0 flex-1 py-1.5">{toast.texte}</span>
            {toast.annuler && (
              <button type="button" onClick={toast.annuler} className="h-11 shrink-0 rounded-[10px] px-3 font-bold text-toast-action underline">
                Annuler
              </button>
            )}
            <button type="button" onClick={fermerToast} aria-label="Fermer le message" className="flex size-11 shrink-0 items-center justify-center rounded-[10px]">
              <Icone nom="fermer" taille={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BoutonEcrire({
  depot,
  glisse,
  setGlisse,
  onClick,
  children,
}: {
  depot: Depot;
  glisse: EtatGlisse;
  setGlisse: (f: (g: EtatGlisse) => EtatGlisse) => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...gestionnairesDepot(depot, glisse, setGlisse)}
      className={`flex h-12 shrink-0 items-center justify-center gap-2.5 rounded-[14px] bg-accent text-[15px] font-bold text-sur-accent ${
        glisse.survol === depot.cle
          ? "outline-[3px] outline-offset-2 outline-texte outline-solid"
          : glisse.charge
            ? "outline-2 outline-offset-2 outline-encre-accent outline-dashed"
            : ""
      }`}
    >
      <Icone nom="ecrire" epaisseur={2} />
      {children}
    </button>
  );
}

/** Tiroir de navigation sur téléphone (dialogue natif : focus piégé, Échap pour fermer). */
function Tiroir({ children, onFermer }: { children: React.ReactNode; onFermer: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Boîtes, dossiers et libellés"
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
      className="anim-tiroir fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[304px] max-w-[85vw] rounded-r-3xl bg-surface p-0 text-texte shadow-[12px_0_40px_rgba(0,0,0,0.18)] backdrop:bg-voile"
    >
      <div className="flex h-full flex-col">{children}</div>
    </dialog>
  );
}
