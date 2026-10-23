"use client";

import Link from "next/link";
import type { Capacites, EtatBoites, Vue } from "@/lib/mail/types";
import { Icone, type NomIcone } from "../Icone";
import {
  Avatar,
  contourDepot,
  gestionnairesDepot,
  Logo,
  PointLibelle,
  type CommerceClient,
  type Depot,
  type EtatGlisse,
  type UtilisateurClient,
} from "./commun";

export const DOSSIERS: { id: "suivis" | "envoyes" | "brouillons" | "archives" | "indesirables" | "corbeille"; nom: string; icone: NomIcone }[] = [
  { id: "suivis", nom: "Suivis", icone: "etoile" },
  { id: "envoyes", nom: "Envoyés", icone: "envoyes" },
  { id: "brouillons", nom: "Brouillons", icone: "brouillons" },
  { id: "archives", nom: "Archives", icone: "archives" },
  { id: "indesirables", nom: "Indésirables", icone: "indesirables" },
  { id: "corbeille", nom: "Corbeille", icone: "corbeille" },
];

export const memeVue = (a: Vue, b: Vue) => a.type === b.type && ("id" in a ? a.id : "") === ("id" in b ? b.id : "");

type Props = {
  commerce: CommerceClient;
  utilisateur: UtilisateurClient;
  etat: EtatBoites;
  capacites: Capacites;
  vue: Vue;
  onVue: (v: Vue) => void;
  /** cible de dépôt d'une entrée de navigation (`null` = n'accepte rien) */
  depot: (v: Vue) => Depot | null;
  glisse: EtatGlisse;
  setGlisse: (f: (g: EtatGlisse) => EtatGlisse) => void;
  sombre: boolean;
  onBasculerMode: () => void;
  /** variante tiroir (téléphone) : rangées plus hautes, pas de bouton Écrire */
  tiroir?: boolean;
  ecrire?: React.ReactNode;
};

export function Navigation(p: Props) {
  const plusieurs = p.etat.boites.length > 1;
  const h = p.tiroir ? "min-h-12 rounded-full text-[15px]" : "min-h-11 rounded-xl text-[14px]";

  const commun = { courante: p.vue, onVue: p.onVue, depot: p.depot, glisse: p.glisse, setGlisse: p.setGlisse, h };
  const titre = "px-3 pb-1.5 text-[12px] font-bold tracking-[0.04em] text-attenue uppercase";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {p.ecrire}
      <div className="sans-barre -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2">
        <div>
          {plusieurs && <h2 className={titre}>Boîtes</h2>}
          <ul role="list" className="m-0 flex list-none flex-col gap-0.5 p-0">
            {p.etat.boites.map((b) => (
              <EntreeNav
                {...commun}
                key={b.id}
                vue={{ type: "boite", id: b.id }}
                icone="boite"
                nom={b.libelle}
                compte={b.nonLus}
                compteLibelle={b.nonLus > 1 ? "non lus" : "non lu"}
              />
            ))}
            {plusieurs && (
              <EntreeNav
                {...commun}
                vue={{ type: "aTrier" }}
                icone="aTrier"
                nom="À trier"
                compte={p.capacites.compteursDossiers ? p.etat.compteurs.aTrier : undefined}
                compteLibelle="à trier"
              />
            )}
          </ul>
        </div>

        <div>
          {plusieurs && <h2 className={titre}>Dossiers</h2>}
          <ul role="list" className="m-0 flex list-none flex-col gap-0.5 p-0">
            {DOSSIERS.filter(d => (d.id !== "suivis" || p.capacites.suivis) && (d.id !== "envoyes" || p.capacites.envoyes) && (d.id !== "brouillons" || p.capacites.brouillons) && (d.id !== "corbeille" || p.capacites.corbeille)).map((d) => (
              <EntreeNav
                {...commun}
                key={d.id}
                vue={{ type: "dossier", id: d.id }}
                icone={d.icone}
                nom={d.nom}
                  compte={p.capacites.compteursDossiers ? (
                  d.id === "indesirables"
                    ? p.etat.compteurs.indesirables
                    : d.id === "corbeille"
                      ? p.etat.compteurs.corbeille
                      : d.id === "brouillons"
                        ? p.etat.compteurs.brouillons
                        : 0
                ) : undefined}
                compteLibelle="conversations"
              />
            ))}
          </ul>
        </div>

        {p.commerce.libelles.length > 0 && (
          <div>
            <h2 className={`flex items-center gap-1.5 ${titre}`}>
              <span className="flex-1">Libellés</span>
              <span className="inline-flex items-center gap-1 font-semibold tracking-normal normal-case">
                <Icone nom="etincelle" taille={13} epaisseur={2} />
                tri auto
              </span>
            </h2>
            <ul role="list" className="m-0 flex list-none flex-col gap-0.5 p-0">
              {p.commerce.libelles.map((l) => (
                <EntreeNav
                  {...commun}
                  key={l.id}
                  vue={{ type: "libelle", id: l.id }}
                  point={l.teinte}
                  nom={l.nom}
                  compte={p.etat.compteurs.libelles[l.id] ?? 0}
                  compteLibelle="non lus"
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl border border-bordure bg-surface p-2.5">
        <Avatar nom={p.utilisateur.nom} taille={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold">{p.utilisateur.nom}</div>
          <div className="truncate text-[12px] text-attenue">{p.utilisateur.email}</div>
        </div>
        <button
          type="button"
          onClick={p.onBasculerMode}
          aria-label={p.sombre ? "Passer en mode clair" : "Passer en mode sombre"}
          title={p.sombre ? "Passer en mode clair" : "Passer en mode sombre"}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-releve text-texte"
        >
          <Icone nom={p.sombre ? "soleil" : "lune"} />
        </button>
        {p.capacites.parametres && <Link
          href="/parametres"
          aria-label="Paramètres"
          title="Paramètres"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-releve text-texte"
        >
          <Icone nom="reglages" />
        </Link>}
      </div>
    </div>
  );
}

function EntreeNav({
  vue,
  icone,
  point,
  nom,
  compte,
  compteLibelle,
  courante,
  onVue,
  depot,
  glisse,
  setGlisse,
  h,
}: {
  vue: Vue;
  icone?: NomIcone;
  point?: string;
  nom: string;
  compte?: number;
  compteLibelle?: string;
  courante: Vue;
  onVue: (v: Vue) => void;
  depot: (v: Vue) => Depot | null;
  glisse: EtatGlisse;
  setGlisse: (f: (g: EtatGlisse) => EtatGlisse) => void;
  h: string;
}) {
  const actif = memeVue(vue, courante);
  const d = depot(vue);
  const g = d ? gestionnairesDepot(d, glisse, setGlisse) : {};
  const survol = d && glisse.survol === d.cle;
  return (
    <li>
      <button
        type="button"
        aria-current={actif ? "page" : undefined}
        onClick={() => onVue(vue)}
        {...g}
        className={`flex w-full items-center gap-3 px-3 text-left ${h} ${actif || survol ? "bg-selection" : "hover:bg-releve"} ${
          actif ? "font-bold text-encre-accent" : "font-medium text-texte"
        } ${d ? contourDepot(d, glisse) : ""}`}
      >
        {icone && <Icone nom={icone} />}
        {point && <PointLibelle teinte={point} taille={h.includes("min-h-12") ? 12 : 10} />}
        <span className="min-w-0 flex-1 truncate">{nom}</span>
        {!!compte && (
          <span className="text-[12.5px] font-bold tabular-nums">
            {compte}
            <span className="sr-only"> {compteLibelle}</span>
          </span>
        )}
      </button>
    </li>
  );
}

export function EnTeteCommerce({ commerce, taille = 42 }: { commerce: CommerceClient; taille?: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Logo commerce={commerce} taille={taille} />
      <div className="min-w-0">
        <div translate="no" className="truncate font-titres text-[19px] leading-tight font-semibold">
          {commerce.nom}
        </div>
        {commerce.accroche && <div className="mt-0.5 truncate text-[12px] text-attenue">{commerce.accroche}</div>}
      </div>
    </div>
  );
}
