"use client";

import { appel } from "@/lib/erreurs";

import { useId, useState, useTransition } from "react";
import { envoyer, iaRediger, iaReecrire } from "@/app/actions";
import type { Boite, Capacites, Conversation, EtatBoites, ModeReecriture, Parametres } from "@/lib/mail/types";
import { Icone } from "../Icone";
import { BoutonIcone, gestionnairesDepot, type EtatGlisse } from "./commun";
import { taille } from "./outils";

export type EtatRedaction = {
  mode: "nouveau" | "reponse" | "transfert";
  conversationId?: string;
  boiteId: string;
  a: string;
  objet: string;
  corps: string;
  fichiers: File[];
  /** pièces déjà reçues, jointes par référence (transfert, glisser d'une pièce) */
  references: { id: string; nom: string; taille: number }[];
  consigne: string;
  note: string;
  prenom: string;
};

const OUTILS: { mode: ModeReecriture; libelle: string; note: string }[] = [
  { mode: "court", libelle: "Plus court", note: "Texte raccourci par l’IA." },
  { mode: "formel", libelle: "Plus formel", note: "Ton rendu plus formel par l’IA." },
  { mode: "chaleureux", libelle: "Plus chaleureux", note: "Ton rendu plus chaleureux par l’IA." },
  { mode: "corriger", libelle: "Corriger", note: "Orthographe et grammaire vérifiées : aucune faute trouvée." },
];

export function Redaction({
  r,
  onChange,
  onFermer,
  onEnvoye,
  boites,
  parametres,
  glisse,
  setGlisse,
  large,
  capacites,
}: {
  r: EtatRedaction;
  large: boolean;
  capacites: Capacites;
  onChange: (patch: Partial<EtatRedaction>) => void;
  onFermer: () => void;
  onEnvoye: (c: Conversation, etat: EtatBoites, texte: string) => void;
  boites: Boite[];
  parametres: Parametres;
  glisse: EtatGlisse;
  setGlisse: (f: (g: EtatGlisse) => EtatGlisse) => void;
}) {
  const id = useId();
  const [occupe, demarrer] = useTransition();
  const [envoi, demarrerEnvoi] = useTransition();
  const [erreur, setErreur] = useState("");
  const titre = r.mode === "reponse" ? "Répondre" : r.mode === "transfert" ? "Transférer" : "Nouveau message";
  const signatureActive = r.mode === "nouveau" ? parametres.signatureNouveaux : parametres.signatureReponses;
  const signature = signatureActive ? (parametres.signatures[r.boiteId] ?? "") : "";
  const iaActive = capacites.ia && parametres.ia.redaction;
  const corpsVide = !r.corps.trim() || /^Bonjour[^,\n]*,$/.test(r.corps.trim());
  const vide = corpsVide && (r.mode === "reponse" || !r.a.trim()) && r.fichiers.length === 0;

  const depot = gestionnairesDepot(
    {
      cle: "redaction",
      accepte: (c, fichiers) => capacites.piecesJointesSortantes && (fichiers || c?.type === "piece"),
      surDepot: (c, fichiers) => {
        if (c?.type === "piece") {
          if (!r.references.some((x) => x.id === c.id)) onChange({ references: [...r.references, { id: c.id, nom: c.nom, taille: c.taille }] });
        } else if (fichiers.length) onChange({ fichiers: [...r.fichiers, ...fichiers] });
      },
    },
    glisse,
    setGlisse,
  );
  const survol = glisse.survol === "redaction";

  const rediger = () =>
    demarrer(async () => {
      try {
        const texte = await appel(iaRediger({ conversationId: r.conversationId, consigne: r.consigne, boiteId: r.boiteId }));
        onChange({
          corps: texte,
          note: r.consigne.trim()
            ? `Brouillon rédigé d’après « ${r.consigne.trim()} ». Relisez avant d’envoyer.`
            : "Brouillon proposé par l’IA. Relisez avant d’envoyer.",
        });
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L’IA n’a pas pu rédiger.");
      }
    });

  const reecrire = (o: (typeof OUTILS)[number]) =>
    demarrer(async () => {
      try {
        onChange({ corps: await appel(iaReecrire(r.corps, o.mode)), note: o.note });
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L’IA n’a pas pu réécrire le texte.");
      }
    });

  const soumettre = () => {
    setErreur("");
    if (r.mode !== "reponse" && !r.a.trim()) {
      setErreur("Indiquez au moins un destinataire.");
      return;
    }
    const texte = r.corps.replace(/\s+$/, "") + (signature ? `\n\n${signature}` : "");
    const fd = new FormData();
    if (r.mode === "reponse" && r.conversationId) fd.set("conversationId", r.conversationId);
    fd.set("boiteId", r.boiteId);
    fd.set("a", r.a);
    fd.set("objet", r.objet);
    fd.set("texte", texte);
    r.fichiers.forEach((f) => fd.append("fichiers", f));
    r.references.forEach((x) => fd.append("references", x.id));
    demarrerEnvoi(async () => {
      try {
        const { conversation, etat } = await appel(envoyer(fd));
        onEnvoye(conversation, etat, r.mode === "reponse" ? "Réponse envoyée" : `Message envoyé à ${r.a.replace(/\s*<.*>$/, "")}.`);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L’envoi a échoué.");
      }
    });
  };

  const puce = "flex h-11 shrink-0 items-center";
  const puceInt =
    "flex h-9 items-center rounded-full border border-bordure px-3.5 text-[13.5px] font-semibold whitespace-nowrap lg:h-8 lg:px-[11px] lg:text-[12.5px]";

  return (
    <div
      role="dialog"
      aria-modal={!large}
      aria-labelledby={`${id}-titre`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && vide) onFermer();
      }}
      {...depot}
      className="anim-monte fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface text-texte lg:inset-auto lg:right-7 lg:bottom-7 lg:z-20 lg:max-h-[calc(100dvh-56px)] lg:w-[600px] lg:max-w-[calc(100%-56px)] lg:rounded-[18px] lg:border lg:border-bordure lg:shadow-[0_24px_64px_rgba(20,14,20,0.24)]"
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-bordure px-1 lg:h-auto lg:border-0 lg:bg-releve lg:py-1.5 lg:pr-1.5 lg:pl-[18px]">
        <BoutonIcone icone="fermer" libelle="Fermer le brouillon" onClick={onFermer} taille={20} className="lg:order-last" />
        <h2 id={`${id}-titre`} className="m-0 min-w-0 flex-1 pl-1 text-[17px] font-bold lg:pl-0 lg:text-[14.5px]">
          {titre}
        </h2>
        {capacites.piecesJointesSortantes && <label htmlFor={`${id}-fichier`} title="Joindre un fichier" className="flex size-11 shrink-0 items-center justify-center rounded-xl lg:hidden">
          <Icone nom="trombone" />
          <span className="sr-only">Joindre un fichier</span>
        </label>}
        <button
          type="button"
          onClick={soumettre}
          disabled={envoi}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-sur-accent disabled:opacity-60 lg:hidden"
        >
          <Icone nom="envoyes" taille={16} epaisseur={2} />
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
      </div>

      <div className="sans-barre flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {boites.length > 1 && (
          <div className="flex items-center gap-2.5 border-b border-bordure px-4 lg:px-[18px]">
            <label htmlFor={`${id}-de`} className="w-11 shrink-0 text-[14px] text-attenue lg:w-[52px] lg:text-[13.5px]">
              De
            </label>
            <select
              id={`${id}-de`}
              value={r.boiteId}
              onChange={(e) => onChange({ boiteId: e.target.value })}
              className="h-12 min-w-0 flex-1 border-0 bg-surface text-[16px] text-texte lg:h-11 lg:text-[14px]"
            >
              {boites.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.libelle} · {b.adresse}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2.5 border-b border-bordure px-4 lg:px-[18px]">
          <label htmlFor={`${id}-a`} className="w-11 shrink-0 text-[14px] text-attenue lg:w-[52px] lg:text-[13.5px]">
            À
          </label>
          <input
            id={`${id}-a`}
            type="text"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            value={r.a}
            onChange={(e) => onChange({ a: e.target.value })}
            readOnly={r.mode === "reponse"}
            placeholder="nom@exemple.nc"
            autoFocus={large && r.mode !== "reponse"}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[16px] text-texte outline-offset-[-2px] lg:h-11 lg:text-[14px]"
          />
        </div>
        <div className="flex items-center gap-2.5 border-b border-bordure px-4 lg:px-[18px]">
          <label htmlFor={`${id}-objet`} className="w-11 shrink-0 text-[14px] text-attenue lg:w-[52px] lg:text-[13.5px]">
            Objet
          </label>
          <input
            id={`${id}-objet`}
            type="text"
            autoComplete="off"
            value={r.objet}
            onChange={(e) => onChange({ objet: e.target.value })}
            placeholder="Objet du message"
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[16px] font-semibold text-texte outline-offset-[-2px] lg:h-11 lg:text-[14px]"
          />
        </div>

        {iaActive && (
          <div className="flex flex-col gap-2 border-b border-bordure bg-ia-fond px-4 py-3 lg:gap-1.5 lg:px-[18px] lg:py-2.5">
            <div className="flex items-center gap-2 text-[13px] font-bold text-encre-accent lg:hidden">
              <Icone nom="ia" taille={16} epaisseur={2} />
              Rédaction avec l’IA
            </div>
            <div className="flex items-end gap-2 lg:items-center">
              <span className="hidden text-encre-accent lg:inline">
                <Icone nom="ia" taille={17} epaisseur={2} />
              </span>
              <label htmlFor={`${id}-consigne`} className="sr-only">
                Demande à l’assistant de rédaction
              </label>
              <input
                id={`${id}-consigne`}
                type="text"
                value={r.consigne}
                onChange={(e) => onChange({ consigne: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    rediger();
                  }
                }}
                placeholder="Dites ce que vous voulez répondre, l’IA rédige"
                className="h-12 min-w-0 flex-1 rounded-[14px] border border-bordure-forte bg-surface px-3 text-[16px] text-texte lg:h-10 lg:rounded-[10px] lg:text-[13.5px]"
              />
              <button
                type="button"
                onClick={rediger}
                disabled={occupe}
                aria-busy={occupe}
                className="h-12 shrink-0 rounded-[14px] bg-accent px-4 text-[14.5px] font-bold text-sur-accent disabled:opacity-70 lg:h-10 lg:rounded-[10px] lg:px-3.5 lg:text-[13.5px]"
              >
                {occupe ? "Rédaction…" : "Rédiger"}
              </button>
            </div>
            <p role="status" className="m-0 min-h-0 text-[13px] leading-snug text-attenue empty:hidden lg:text-[12.5px]">
              {r.note}
            </p>
          </div>
        )}

        <label htmlFor={`${id}-corps`} className="sr-only">
          Message
        </label>
        <textarea
          id={`${id}-corps`}
          rows={9}
          value={r.corps}
          onChange={(e) => onChange({ corps: e.target.value, note: "" })}
          placeholder="Votre message…"
          autoFocus={large && r.mode === "reponse"}
          className="block min-h-[200px] w-full shrink-0 resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-[16px] leading-[1.6] text-texte outline-offset-[-2px] transition-opacity lg:min-h-[180px] lg:resize-y lg:px-[18px] lg:text-[14.5px]"
          style={{ opacity: occupe ? 0.45 : 1 }}
        />

        {iaActive && (
          <div className="py-1 lg:flex lg:flex-wrap lg:items-center lg:gap-1.5 lg:px-[18px] lg:pt-0.5 lg:pb-2">
            <div className="px-4 text-[12.5px] font-bold text-attenue lg:mr-0.5 lg:px-0">Améliorer</div>
            <div className="sans-barre flex gap-1.5 overflow-x-auto px-4 lg:contents">
              {OUTILS.map((o) => (
                <button key={o.mode} type="button" onClick={() => reecrire(o)} disabled={occupe || !r.corps.trim()} className={`${puce} disabled:opacity-50`}>
                  <span className={`${puceInt} bg-surface hover:bg-releve`}>{o.libelle}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {parametres.reponsesTypes.length > 0 && (
          <div className="pt-0.5 pb-1.5 lg:flex lg:flex-wrap lg:items-center lg:gap-1.5 lg:px-[18px] lg:pt-0 lg:pb-2.5">
            <div className="px-4 text-[12.5px] font-bold text-attenue lg:mr-0.5 lg:px-0">Réponses types</div>
            <div className="sans-barre flex gap-1.5 overflow-x-auto px-4 lg:contents">
              {parametres.reponsesTypes.map((t) => (
                <button
                  key={t.titre}
                  type="button"
                  onClick={() => onChange({ corps: t.corps.replace(/ ?\{prenom\}/g, r.prenom ? ` ${r.prenom}` : ""), note: "" })}
                  className={puce}
                >
                  <span className={`${puceInt} bg-releve`}>{t.titre}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(r.fichiers.length > 0 || r.references.length > 0) && (
          <ul role="list" aria-label="Pièces jointes" className="m-0 flex list-none flex-col gap-1.5 px-4 pt-1 pb-2 lg:flex-row lg:flex-wrap lg:gap-2 lg:px-[18px]">
            {[
              ...r.references.map((x, i) => ({ cle: `r${x.id}`, nom: x.nom, taille: x.taille, retirer: () => onChange({ references: r.references.filter((_, j) => j !== i) }) })),
              ...r.fichiers.map((f, i) => ({ cle: `f${i}-${f.name}`, nom: f.name, taille: f.size, retirer: () => onChange({ fichiers: r.fichiers.filter((_, j) => j !== i) }) })),
            ].map((f) => (
              <li key={f.cle} className="flex items-center gap-2 rounded-[14px] border border-bordure bg-releve pl-3 text-[14px] font-semibold lg:rounded-[10px] lg:text-[12.5px]">
                <Icone nom="trombone" taille={14} epaisseur={2} />
                <span className="min-w-0 flex-1 truncate">
                  {f.nom} <span className="font-medium text-attenue">{taille(f.taille)}</span>
                </span>
                <BoutonIcone icone="fermer" libelle={`Retirer ${f.nom}`} onClick={f.retirer} taille={14} />
              </li>
            ))}
          </ul>
        )}

        {signature && (
          <div className="mx-4 mt-1 mb-6 border-t border-dashed border-bordure-forte pt-2.5 text-[13.5px] leading-normal whitespace-pre-line text-attenue lg:mx-[18px] lg:mb-3 lg:text-[13px]">
            {signature}
          </div>
        )}
        {erreur && (
          <p role="alert" className="mx-4 mb-3 rounded-xl bg-alerte-fond px-3 py-2 text-[14px] text-alerte-texte lg:mx-[18px]">
            {erreur}
          </p>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 border-t border-bordure py-2.5 pr-3 pl-[18px] lg:flex">
        <button
          type="button"
          onClick={soumettre}
          disabled={envoi}
          className="flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14.5px] font-bold text-sur-accent disabled:opacity-60"
        >
          <Icone nom="envoyes" taille={16} epaisseur={2} />
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
        {capacites.piecesJointesSortantes && <label htmlFor={`${id}-fichier`} title="Joindre un fichier" className="flex size-11 items-center justify-center rounded-xl hover:bg-releve">
          <Icone nom="trombone" />
          <span className="sr-only">Joindre un fichier</span>
        </label>}
        {capacites.piecesJointesSortantes && <span className="ml-auto text-[12.5px] text-attenue">Glissez des fichiers ici pour les joindre</span>}
      </div>
      {capacites.piecesJointesSortantes && <input
        id={`${id}-fichier`}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          const f = Array.from(e.target.files ?? []);
          if (f.length) onChange({ fichiers: [...r.fichiers, ...f] });
          e.target.value = "";
        }}
      />}

      {capacites.piecesJointesSortantes && survol && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-[14px] border-2 border-dashed border-encre-accent bg-depot-fond text-[16px] font-bold text-encre-accent"
        >
          Déposez pour joindre au message
        </div>
      )}
    </div>
  );
}
