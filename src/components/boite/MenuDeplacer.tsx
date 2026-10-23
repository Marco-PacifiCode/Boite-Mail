"use client";

import { useEffect, useRef } from "react";
import { Icone, type NomIcone } from "../Icone";
import { PointLibelle, type CommerceClient } from "./commun";
import type { Capacites } from "@/lib/mail/types";

export type Destination =
  | { type: "boite"; id: string }
  | { type: "dossier"; id: "reception" | "suivis" | "archives" | "indesirables" | "corbeille" }
  | { type: "libelle"; id: string };

const DOSSIERS: { id: "reception" | "suivis" | "archives" | "indesirables" | "corbeille"; nom: string; icone: NomIcone }[] = [
  { id: "reception", nom: "Remettre dans sa boîte", icone: "remettre" },
  { id: "suivis", nom: "Suivis", icone: "etoile" },
  { id: "archives", nom: "Archives", icone: "archives" },
  { id: "indesirables", nom: "Indésirables", icone: "indesirables" },
  { id: "corbeille", nom: "Corbeille", icone: "corbeille" },
];

/**
 * « Déplacer vers… » : l'alternative au clavier (et au tactile) du glisser-déposer.
 * Boîte de dialogue native (`<dialog>`) : focus piégé, Échap pour fermer.
 */
export function MenuDeplacer({
  commerce,
  nombre,
  seulement,
  libellesActifs,
  boiteActuelle,
  capacites,
  onChoisir,
  onFermer,
}: {
  commerce: CommerceClient;
  nombre: number;
  seulement?: "boites" | "libelles";
  /** libellés portés par toutes les conversations choisies */
  libellesActifs: string[];
  boiteActuelle: string | null;
  capacites: Capacites;
  onChoisir: (d: Destination) => void;
  onFermer: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  const destinations = DOSSIERS.filter(d => (d.id !== "suivis" || capacites.suivis) && (d.id !== "corbeille" || capacites.corbeille));
  const titre =
    seulement === "boites"
      ? "Choisir la bonne boîte"
      : seulement === "libelles"
        ? "Choisir le bon libellé"
        : nombre > 1
          ? `Déplacer ${nombre} conversations vers…`
          : "Déplacer vers…";
  const aide =
    seulement === "boites"
      ? "Jev apprendra de votre choix pour les prochains mails."
      : seulement === "libelles"
        ? "Le tri automatique apprendra de votre choix."
        : null;
  const ligne = "flex min-h-[52px] w-full items-center gap-3.5 rounded-[14px] px-3 text-left text-[15.5px] font-semibold hover:bg-releve lg:min-h-12 lg:text-[15px]";
  const rubrique = "px-1 pt-3 pb-1 text-[12.5px] font-bold tracking-[0.04em] text-attenue uppercase";

  return (
    <dialog
      ref={ref}
      aria-labelledby="deplacer-titre"
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
      className="anim-feuille fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none rounded-t-[26px] bg-surface p-0 text-texte shadow-[0_-12px_40px_rgba(0,0,0,0.2)] backdrop:bg-voile lg:anim-fondu lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80dvh] lg:w-[420px] lg:rounded-[20px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div aria-hidden="true" className="flex justify-center pt-2 lg:hidden">
          <span className="h-[5px] w-10 rounded-full bg-bordure-forte" />
        </div>
        <div className="flex items-center gap-2 pt-1 pr-2 pb-0.5 pl-5 lg:pt-3">
          <h2 id="deplacer-titre" className="m-0 min-w-0 flex-1 text-[18px] leading-snug font-bold">
            {titre}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-releve"
          >
            <Icone nom="fermer" />
          </button>
        </div>
        <div className="sans-barre min-h-0 overflow-y-auto px-4 pt-1.5 pb-[max(24px,env(safe-area-inset-bottom))]">
          {aide && <p className="m-0 mx-1 mb-2 text-[14px] leading-[1.45] text-attenue">{aide}</p>}

          {seulement !== "libelles" && commerce.boites.length > 1 && (
            <>
              <h3 className={rubrique}>Boîtes</h3>
              <ul role="list" className="m-0 list-none p-0">
                {commerce.boites.map((b) => (
                  <li key={b.id}>
                    <button type="button" className={ligne} onClick={() => onChoisir({ type: "boite", id: b.id })}>
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-releve">
                        <Icone nom="boite" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block">{b.libelle}</span>
                        <span className="block truncate text-[12.5px] font-medium text-attenue">{b.adresse}</span>
                      </span>
                      {boiteActuelle === b.id && (
                        <>
                          <Icone nom="coche" epaisseur={2.4} />
                          <span className="sr-only">(boîte actuelle)</span>
                        </>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!seulement && (
            <>
              <h3 className={rubrique}>Dossiers</h3>
              <ul role="list" className="m-0 list-none p-0">
                {destinations.map((d) => (
                  <li key={d.id}>
                    <button type="button" className={ligne} onClick={() => onChoisir({ type: "dossier", id: d.id })}>
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-releve">
                        <Icone nom={d.icone} />
                      </span>
                      <span className="flex-1">{d.nom}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {seulement !== "boites" && commerce.libelles.length > 0 && (
            <>
              <h3 className={rubrique}>Libellés</h3>
              <ul role="list" className="m-0 list-none p-0">
                {commerce.libelles.map((l) => {
                  const actif = libellesActifs.includes(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-pressed={actif}
                        className={`${ligne} ${actif ? "bg-selection" : ""}`}
                        onClick={() => onChoisir({ type: "libelle", id: l.id })}
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-[11px]"
                          style={{ background: `var(--puce-${l.teinte}-fond)` }}
                        >
                          <PointLibelle teinte={l.teinte} taille={12} />
                        </span>
                        <span className="flex-1">{l.nom}</span>
                        {actif && <Icone nom="coche" epaisseur={2.4} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
