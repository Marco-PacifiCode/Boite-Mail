"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { ResumeConversation } from "@/lib/mail/types";
import { Icone } from "../Icone";
import { Avatar, Puce, type CommerceClient } from "./commun";
import { dateCourte } from "./outils";

export type Balayage = "lu" | "archiver" | "remettre" | "supprimer";

type Props = {
  c: ResumeConversation;
  commerce: CommerceClient;
  actif: boolean;
  coche: boolean;
  modeSelection: boolean;
  /** disposition ordinateur : glisser-déposer à la souris ; sinon gestes tactiles */
  large: boolean;
  /** afficher la boîte de la conversation (vues qui mélangent les boîtes) */
  montrerBoite: boolean;
  /** action du balayage court vers la gauche, et du balayage long */
  gaucheCourt: Balayage;
  gaucheLong: Balayage;
  enGlisse: boolean;
  onOuvrir: () => void;
  onCocher: () => void;
  onAppuiLong: () => void;
  onSuivi: () => void;
  afficherSuivi?: boolean;
  onDeplacer: () => void;
  onBalayage: (a: Balayage) => void;
  onGlisserDebut: (e: React.DragEvent) => void;
  onGlisserFin: () => void;
};

const SEUIL = 88;
const SEUIL_LONG = 200;

const LIBELLES_BALAYAGE: Record<Balayage, string> = {
  lu: "Lu",
  archiver: "Archiver",
  remettre: "Remettre",
  supprimer: "Supprimer",
};

export function Ligne(p: Props) {
  const { c, commerce } = p;
  const [dx, setDx] = useState(0);
  const [glisseEnCours, setGlisseEnCours] = useState(false);
  const geste = useRef<{ x: number; y: number; mode: null | "balayage" | "aucun" | "long"; id: number } | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignorerClic = useRef(false);

  const action = (v: number): Balayage | null =>
    v >= SEUIL ? "lu" : v <= -SEUIL_LONG ? p.gaucheLong : v <= -SEUIL ? p.gaucheCourt : null;

  const annulerMinuteur = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
  };

  const bas = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || e.button !== 0) return;
    ignorerClic.current = false;
    geste.current = { x: e.clientX, y: e.clientY, mode: null, id: e.pointerId };
    annulerMinuteur();
    minuteur.current = setTimeout(() => {
      const g = geste.current;
      if (!g || g.mode) return;
      g.mode = "long";
      ignorerClic.current = true;
      try {
        navigator.vibrate?.(12);
      } catch {
        /* vibration indisponible */
      }
      p.onAppuiLong();
    }, 460);
  };

  const deplace = (e: PointerEvent<HTMLDivElement>) => {
    const g = geste.current;
    if (!g || g.id !== e.pointerId) return;
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    if (!g.mode) {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy) * 1.2 && !p.modeSelection) {
        g.mode = "balayage";
        annulerMinuteur();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture refusée */
        }
        setGlisseEnCours(true);
      } else if (Math.abs(ddx) > 10 || Math.abs(ddy) > 10) {
        g.mode = "aucun";
        annulerMinuteur();
      }
    }
    if (g.mode === "balayage") {
      ignorerClic.current = true;
      setDx(Math.round(ddx > 0 ? (ddx > 150 ? 150 + (ddx - 150) * 0.25 : ddx) : Math.max(ddx, -320)));
    }
  };

  const fin = (annule: boolean) => {
    annulerMinuteur();
    const g = geste.current;
    geste.current = null;
    if (!g || g.mode !== "balayage") return;
    setGlisseEnCours(false);
    const a = annule ? null : action(dx);
    if (!a || a === "lu") {
      setDx(0);
      if (a) p.onBalayage(a);
      return;
    }
    setDx(-480);
    setTimeout(() => {
      p.onBalayage(a);
      setDx(0);
    }, 210);
  };

  const libelles = c.libelles.map((id) => commerce.libelles.find((l) => l.id === id)).filter((l) => !!l);
  const autoLib = (id: string) => !c.corrige && !!c.verdict?.libelles.includes(id);
  const nomBoite = commerce.boites.find((b) => b.id === c.boiteId)?.libelle;
  const personnes =
    c.nbMessages === 1 && !c.aRecu
      ? `À : ${c.correspondant?.nom ?? "destinataire"}`
      : c.participants.join(", ") || c.correspondant?.nom || c.objet || "(sans objet)";
  const nomAvatar = c.correspondant?.nom ?? personnes;
  const a = action(dx);
  const versDroite = dx > 0;
  const fondBalayage =
    a === "lu" ? "var(--accent)" : a === "supprimer" ? "var(--balayage-supprimer)" : a ? "var(--balayage-archiver)" : "var(--releve)";
  const texteBalayage = a === "lu" ? "var(--sur-accent)" : a ? "var(--sur-balayage)" : "var(--attenue)";
  const libelleBalayage = versDroite ? (c.lu ? "Non lu" : "Lu") : LIBELLES_BALAYAGE[a ?? p.gaucheCourt];

  return (
    <li
      className="relative mx-2 mb-0.5 overflow-hidden rounded-2xl"
      draggable={p.large}
      onDragStart={p.large ? p.onGlisserDebut : undefined}
      onDragEnd={p.large ? p.onGlisserFin : undefined}
      aria-roledescription={p.large ? "conversation déplaçable" : undefined}
      aria-describedby={p.large ? "aide-glisser" : undefined}
      style={{ opacity: p.enGlisse ? 0.45 : 1 }}
    >
      {dx !== 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center px-6 text-[14px] font-bold transition-colors"
          style={{ justifyContent: versDroite ? "flex-start" : "flex-end", background: fondBalayage, color: texteBalayage }}
        >
          <span className="flex items-center gap-2 transition-transform" style={{ transform: a ? "scale(1.12)" : "none" }}>
            <Icone
              nom={versDroite ? "courrier" : a === "supprimer" ? "corbeille" : (a ?? p.gaucheCourt) === "remettre" ? "remettre" : "archives"}
              epaisseur={2}
            />
            {libelleBalayage}
          </span>
        </div>
      )}
      <div
        onPointerDown={bas}
        onPointerMove={deplace}
        onPointerUp={() => fin(false)}
        onPointerCancel={() => fin(true)}
        onClickCapture={(e) => {
          if (ignorerClic.current) {
            ignorerClic.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onContextMenu={(e) => {
          if (!p.large) e.preventDefault();
        }}
        className={`group relative flex items-start rounded-2xl ${
          p.coche || p.actif ? "bg-selection" : "bg-surface lg:hover:bg-releve"
        } ${p.large ? "cursor-grab" : ""}`}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: glisseEnCours ? "none" : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          touchAction: "pan-y",
          userSelect: p.large ? undefined : "none",
          WebkitUserSelect: p.large ? undefined : "none",
          WebkitTouchCallout: "none",
        }}
      >
        <button
          type="button"
          aria-pressed={p.coche}
          aria-label={`${p.coche ? "Désélectionner" : "Sélectionner"} : ${c.objet}`}
          onClick={p.onCocher}
          className="mt-2 ml-1 flex size-12 shrink-0 items-center justify-center rounded-full"
        >
          {p.coche ? (
            <span aria-hidden="true" className="anim-fondu flex size-[38px] items-center justify-center rounded-full bg-encre-accent text-surface">
              <Icone nom="coche" epaisseur={2.6} />
            </span>
          ) : (
            <Avatar nom={nomAvatar} />
          )}
        </button>
        <button
          type="button"
          onClick={() => (p.modeSelection ? p.onCocher() : p.onOuvrir())}
          aria-current={p.actif ? "true" : undefined}
          className="flex min-w-0 flex-1 flex-col gap-[3px] py-3 pr-0.5 pl-2 text-left"
        >
          <span className="flex w-full items-center gap-1.5">
            {!c.lu && (
              <>
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-encre-accent" />
                <span className="sr-only">Non lu. </span>
              </>
            )}
            <span className={`min-w-0 truncate text-[14px] lg:text-[14px] ${c.lu ? "font-medium" : "font-bold"} max-lg:text-[15px]`}>
              {personnes}
            </span>
            <span className="flex-1 text-[12px] font-semibold text-attenue">
              {c.nbMessages > 1 && (
                <>
                  {c.nbMessages}
                  <span className="sr-only"> messages</span>
                </>
              )}
            </span>
            <span className={`shrink-0 text-[12px] tabular-nums ${c.lu ? "text-attenue" : "font-bold text-encre-accent"}`}>
              {dateCourte(c.derniereDate, commerce.fuseau)}
            </span>
          </span>
          <span className={`truncate text-[13.5px] max-lg:text-[14.5px] ${c.lu ? "font-medium" : "font-bold"}`}>{c.objet}</span>
          <span className="truncate text-[13px] text-attenue max-lg:text-[13.5px]">{c.extrait}</span>
          {(libelles.length > 0 || c.nbPiecesJointes > 0 || (p.montrerBoite && nomBoite)) && (
            <span className="mt-1 flex min-w-0 items-center gap-2">
              {libelles.slice(0, 2).map((l) => (
                <Puce key={l.id} libelle={l} auto={autoLib(l.id)} />
              ))}
              {c.nbPiecesJointes > 0 && (
                <span className="inline-flex min-w-0 items-center gap-1 text-[12px] text-attenue">
                  <Icone nom="trombone" taille={14} epaisseur={2} />
                  <span className="truncate">
                    {c.nbPiecesJointes > 1 ? `${c.nbPiecesJointes} fichiers` : c.premierePieceJointe}
                  </span>
                </span>
              )}
              {p.montrerBoite && nomBoite && <span className="truncate text-[12px] text-attenue">· {nomBoite}</span>}
            </span>
          )}
        </button>
        {!p.modeSelection && (
          <div className="flex shrink-0 flex-col items-center pt-1.5 pr-0.5 max-lg:pt-7">
            {p.afficherSuivi !== false && <button
              type="button"
              aria-pressed={c.suivi}
              aria-label={c.suivi ? "Ne plus suivre" : "Suivre cette conversation"}
              title={c.suivi ? "Ne plus suivre" : "Suivre cette conversation"}
              onClick={p.onSuivi}
              className={`flex size-11 items-center justify-center rounded-xl ${c.suivi ? "text-etoile" : "text-attenue"}`}
            >
              <Icone nom="etoile" taille={17} plein={c.suivi ? "currentColor" : undefined} />
            </button>}
            <button
              type="button"
              aria-label={`Déplacer vers… (${c.objet})`}
              title="Déplacer vers…"
              onClick={p.onDeplacer}
              className="hidden size-11 items-center justify-center rounded-xl text-attenue opacity-0 group-hover:opacity-100 focus-visible:opacity-100 lg:flex"
            >
              <Icone nom="deplacer" taille={17} />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
