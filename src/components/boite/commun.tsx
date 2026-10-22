"use client";

import { useSyncExternalStore, type ComponentProps, type DragEvent, type ReactNode } from "react";
import type { Libelle } from "@/lib/mail/types";
import { Icone, type NomIcone } from "../Icone";
import { avatar } from "./outils";

/** Données du commerce utiles à l'interface (aucune donnée privée). */
export type CommerceClient = {
  nom: string;
  accroche: string;
  domaine: string;
  fuseau: string;
  logo: { initiale: string; image?: string };
  boites: { id: string; adresse: string; libelle: string }[];
  libelles: Libelle[];
};

export type UtilisateurClient = { nom: string; email: string };

const LARGE = "(min-width: 1024px)";

/** Vrai au-dessus de 1024 px (disposition ordinateur). Faux côté serveur. */
export function useEcranLarge(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(LARGE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(LARGE).matches,
    () => false,
  );
}

export function Avatar({ nom, taille = 38, className = "" }: { nom: string; taille?: number; className?: string }) {
  const a = avatar(nom);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${className}`}
      style={{
        width: taille,
        height: taille,
        fontSize: taille >= 40 ? 14 : 13,
        background: `var(--avatar-${a.teinte}-fond)`,
        color: `var(--avatar-${a.teinte}-texte)`,
      }}
    >
      {a.initiales}
    </span>
  );
}

export function Puce({ libelle, auto }: { libelle: Libelle; auto?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-bold"
      style={{ background: `var(--puce-${libelle.teinte}-fond)`, color: `var(--puce-${libelle.teinte}-texte)` }}
    >
      {auto && (
        <>
          <Icone nom="etincelle" taille={11} epaisseur={2.4} />
          <span className="sr-only">Classé par Jev : </span>
        </>
      )}
      {libelle.nom}
    </span>
  );
}

export function PointLibelle({ teinte, taille = 10 }: { teinte: string; taille?: number }) {
  return (
    <span
      aria-hidden="true"
      className="mx-1 shrink-0 rounded-[3px]"
      style={{ width: taille, height: taille, background: `var(--puce-${teinte}-texte)` }}
    />
  );
}

/** Bouton carré de 44 px avec icône seule : le libellé est obligatoire (lecteurs d'écran, info-bulle). */
export function BoutonIcone({
  icone,
  libelle,
  plein,
  className = "",
  taille = 18,
  ...reste
}: { icone: NomIcone; libelle: string; plein?: string; taille?: number } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type="button"
      aria-label={libelle}
      title={libelle}
      className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-texte hover:bg-releve ${className}`}
      {...reste}
    >
      <Icone nom={icone} plein={plein} taille={taille} />
    </button>
  );
}

/** Logo du commerce. `inverse` : posé sur le panneau de marque (page de connexion). */
export function Logo({ commerce, taille = 42, inverse }: { commerce: CommerceClient; taille?: number; inverse?: boolean }) {
  if (commerce.logo.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo SVG du commerce, taille fixe
      <img
        src={commerce.logo.image}
        alt=""
        width={taille}
        height={taille}
        className={`shrink-0 rounded-xl ${inverse ? "ring-1 ring-panneau-texte/30" : ""}`}
        style={{ width: taille, height: taille }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl font-titres font-semibold ${
        inverse ? "bg-panneau-texte text-panneau-fond" : "bg-accent text-sur-accent"
      }`}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.52) }}
    >
      {commerce.logo.initiale}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Glisser-déposer (ordinateur)
// ---------------------------------------------------------------------------

export type Charge =
  | { type: "conversation"; ids: string[] }
  | { type: "piece"; id: string; nom: string; taille: number; mime: string };

export type EtatGlisse = { charge: Charge | null; survol: string | null };

export type Depot = {
  /** clé unique de la cible */
  cle: string;
  accepte: (c: Charge | null, fichiers: boolean) => boolean;
  surDepot: (c: Charge | null, fichiers: File[]) => void;
};

/** Gestionnaires d'une cible de dépôt. `fichiers` = l'utilisateur glisse des fichiers de l'ordinateur. */
export function gestionnairesDepot(
  d: Depot,
  glisse: EtatGlisse,
  setGlisse: (f: (g: EtatGlisse) => EtatGlisse) => void,
) {
  const aFichiers = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  return {
    onDragOver: (e: DragEvent) => {
      if (!d.accepte(glisse.charge, aFichiers(e))) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = glisse.charge?.type === "conversation" ? "move" : "copy";
      if (glisse.survol !== d.cle) setGlisse((g) => ({ ...g, survol: d.cle }));
    },
    onDragLeave: (e: DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setGlisse((g) => (g.survol === d.cle ? { ...g, survol: null } : g));
    },
    onDrop: (e: DragEvent) => {
      const fichiers = Array.from(e.dataTransfer?.files ?? []);
      if (!d.accepte(glisse.charge, fichiers.length > 0)) return;
      e.preventDefault();
      const c = glisse.charge;
      setGlisse(() => ({ charge: null, survol: null }));
      d.surDepot(c, fichiers);
    },
  };
}

/** Contour d'une cible : plein au survol, pointillé quand elle accepte ce qu'on glisse. */
export function contourDepot(d: Depot, glisse: EtatGlisse): string {
  if (glisse.survol === d.cle) return "outline-2 outline-solid outline-encre-accent -outline-offset-2";
  if (glisse.charge && d.accepte(glisse.charge, false)) return "outline-2 outline-dashed outline-bordure-forte -outline-offset-2";
  return "";
}

export function Vide({ children }: { children: ReactNode }) {
  return <div className="px-5 py-12 text-center text-[14px] leading-relaxed text-attenue">{children}</div>;
}
