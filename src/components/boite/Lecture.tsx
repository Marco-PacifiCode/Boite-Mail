"use client";

import { useState } from "react";
import type { Conversation, Message, PieceJointe, ResumeIA } from "@/lib/mail/types";
import { Icone } from "../Icone";
import { Avatar, BoutonIcone, Puce, type CommerceClient } from "./commun";
import { CorpsMessage } from "./CorpsMessage";
import { dateLongue, taille, typeCourt } from "./outils";

export type ActionsLecture = {
  onRetour: () => void;
  onArchiver: () => void;
  onIndesirable: () => void;
  onSupprimer: () => void;
  onNonLu: () => void;
  onSuivi: () => void;
  onDeplacer: (seulement?: "boites" | "libelles") => void;
  onRepondre: (brouillon?: string, note?: string) => void;
  onTransferer: () => void;
  onGlisserPiece: (e: React.DragEvent, p: PieceJointe) => void;
  onGlisserFin: () => void;
};

const pourcent = (x: number) => `${Math.round(x * 100)} %`;

export function Lecture({
  conversation,
  ia,
  commerce,
  large,
  actions,
}: {
  conversation: Conversation;
  ia: ResumeIA | null;
  commerce: CommerceClient;
  large: boolean;
  actions: ActionsLecture;
}) {
  const c = conversation;
  const n = c.messages.length;
  const [ouverts, setOuverts] = useState<Record<number, boolean>>({});
  const [tout, setTout] = useState(false);
  const [resume, setResume] = useState(false);

  const plusieurs = commerce.boites.length > 1;
  const nomBoite = (id: string | null) => commerce.boites.find((b) => b.id === id)?.libelle ?? "";
  const libelles = c.libelles.map((id) => commerce.libelles.find((l) => l.id === id)).filter((l) => !!l);
  const libelleAuto = !c.corrige && !c.indesirable ? libelles.find((l) => c.verdict?.libelles.includes(l.id)) : undefined;
  const peutRepondre = !c.indesirable && c.aRecu;
  const estOuvert = (i: number) => ouverts[i] ?? i === n - 1;
  const indices: number[] = n >= 4 && !tout ? [0, -1, n - 2, n - 1] : Array.from({ length: n }, (_, i) => i);
  const caches = n - 3;

  return (
    <section aria-label="Conversation ouverte" className="flex min-h-0 flex-1 flex-col">
      <div role="toolbar" aria-label="Actions sur la conversation" className="flex h-14 shrink-0 items-center gap-0.5 border-b border-bordure px-1 lg:h-auto lg:flex-wrap lg:px-4 lg:py-2.5">
        <BoutonIcone icone="gaucheChevron" libelle="Retour à la liste" onClick={actions.onRetour} taille={22} className="lg:hidden" />
        <span className="flex-1 lg:hidden" />
        <BoutonIcone icone="archives" libelle={c.archive ? "Remettre dans la boîte" : "Archiver"} onClick={actions.onArchiver} />
        <BoutonIcone icone="indesirables" libelle={c.indesirable ? "Ce n’est pas un spam" : "Signaler comme spam"} onClick={actions.onIndesirable} />
        <BoutonIcone icone="corbeille" libelle={c.supprime ? "Retirer de la corbeille" : "Supprimer"} onClick={actions.onSupprimer} />
        <span aria-hidden="true" className="mx-1.5 hidden h-6 w-px bg-bordure lg:block" />
        <BoutonIcone icone="courrier" libelle="Marquer comme non lu" onClick={actions.onNonLu} />
        <BoutonIcone icone="deplacer" libelle="Déplacer vers…" onClick={() => actions.onDeplacer()} />
        <button
          type="button"
          aria-pressed={c.suivi}
          aria-label={c.suivi ? "Ne plus suivre" : "Suivre cette conversation"}
          title={c.suivi ? "Ne plus suivre" : "Suivre cette conversation"}
          onClick={actions.onSuivi}
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-releve ${c.suivi ? "text-etoile" : "text-texte"}`}
        >
          <Icone nom="etoile" plein={c.suivi ? "currentColor" : undefined} />
        </button>
      </div>

      <div className="sans-barre min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <article className="flex max-w-[860px] flex-col gap-4 px-[18px] pt-[18px] pb-7 lg:px-8 lg:pt-6 lg:pb-8">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
            <h2 className="m-0 text-[21px] leading-[1.3] font-bold text-balance lg:text-[23px] lg:leading-[1.25]">{c.objet}</h2>
            {libelles.map((l) => (
              <Puce key={l.id} libelle={l} />
            ))}
          </div>

          {c.indesirable && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-alerte-fond px-4 py-3.5 text-alerte-texte">
              <Icone nom="indesirables" epaisseur={2} />
              <p className="m-0 min-w-[min(260px,100%)] flex-1 text-[14px] leading-[1.45]">
                <strong>{c.verdict?.indesirable ? "Placé dans Indésirables automatiquement." : "Signalé comme spam."}</strong>{" "}
                {c.verdict?.indesirable ? c.verdict.raison : "Vous l’avez signalé comme spam."}
              </p>
              <button
                type="button"
                onClick={actions.onIndesirable}
                className="min-h-11 rounded-xl border border-current px-4 text-[13.5px] font-bold"
              >
                Ce n’est pas un spam
              </button>
            </div>
          )}

          {!c.indesirable && c.aTrier && c.verdict && (
            <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13.5px] leading-[1.45] text-attenue">
              <Icone nom="etincelle" taille={14} epaisseur={2} />
              <span className="min-w-0 flex-[1_1_200px]">
                Jev n’a pas su choisir la boîte (confiance {pourcent(c.verdict.confiance)}) : {c.verdict.raison}
              </span>
              <button type="button" onClick={() => actions.onDeplacer("boites")} className="min-h-11 px-1 font-bold text-encre-accent underline">
                Choisir la boîte
              </button>
            </p>
          )}

          {!c.indesirable && !c.aTrier && plusieurs && c.verdict?.boiteId && !c.corrige && (
            <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13.5px] leading-[1.45] text-attenue">
              <Icone nom="etincelle" taille={14} epaisseur={2} />
              <span>
                Rangé dans {nomBoite(c.boiteId)} par Jev (confiance {pourcent(c.verdict.confiance)})
              </span>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => actions.onDeplacer("boites")} className="min-h-11 px-1 font-bold text-encre-accent underline">
                Mauvaise boîte ?
              </button>
            </p>
          )}

          {libelleAuto && (
            <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13.5px] leading-[1.45] text-attenue">
              <Icone nom="etincelle" taille={14} epaisseur={2} />
              <span>Jev a classé cette conversation dans {libelleAuto.nom}.</span>
              <button type="button" onClick={() => actions.onDeplacer("libelles")} className="min-h-11 px-1 font-bold text-encre-accent underline">
                Mauvais libellé ?
              </button>
            </p>
          )}

          {ia && (
            <div>
              <button
                type="button"
                aria-expanded={resume}
                aria-controls="resume-ia"
                onClick={() => setResume(!resume)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-releve px-4 text-[13.5px] font-bold"
              >
                <span className="text-encre-accent">
                  <Icone nom="ia" taille={16} epaisseur={2} />
                </span>
                Résumé IA
                <Icone nom={resume ? "hautChevron" : "basChevron"} taille={15} epaisseur={2} />
              </button>
              {resume && (
                <div id="resume-ia" className="anim-fondu mt-2.5 rounded-2xl border border-bordure bg-releve px-[18px] py-4">
                  <ul role="list" className="m-0 list-none p-0">
                    {ia.points.map((t, i) => (
                      <li key={i} className="mb-1.5 flex gap-2.5 text-[14px] leading-[1.55]">
                        <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-encre-accent" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                  {ia.aFaire && (
                    <p className="m-0 mt-2.5 text-[13.5px] leading-normal">
                      <strong>À faire :</strong> {ia.aFaire}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <ol role="list" className="m-0 flex list-none flex-col border-t border-bordure p-0">
            {indices.map((i) =>
              i === -1 ? (
                <li key="compteur" className="relative h-[52px] border-b border-bordure lg:h-12">
                  <span aria-hidden="true" className="absolute inset-x-0 top-[25px] border-t border-bordure lg:top-[23px]" />
                  <button
                    type="button"
                    onClick={() => setTout(true)}
                    aria-label={`Afficher ${caches} ${caches > 1 ? "messages plus anciens" : "message plus ancien"}`}
                    title={`Afficher ${caches} ${caches > 1 ? "messages plus anciens" : "message plus ancien"}`}
                    className="absolute top-1 left-0 size-11 rounded-full border border-bordure bg-surface text-[13px] font-bold lg:left-1.5"
                  >
                    {caches}
                  </button>
                </li>
              ) : (
                <MessageVue
                  key={c.messages[i].id}
                  m={c.messages[i]}
                  ouvert={estOuvert(i)}
                  onBascule={() => setOuverts((o) => ({ ...o, [i]: !estOuvert(i) }))}
                  fuseau={commerce.fuseau}
                  sujet={c.objet}
                  peutRepondre={peutRepondre}
                  onRepondre={() => actions.onRepondre()}
                  large={large}
                  onGlisserPiece={actions.onGlisserPiece}
                  onGlisserFin={actions.onGlisserFin}
                />
              ),
            )}
          </ol>

          {peutRepondre && ia && ia.suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-[13px] font-bold text-attenue">
                <span className="text-encre-accent">
                  <Icone nom="ia" taille={15} epaisseur={2} />
                </span>
                Réponses suggérées par l’IA
              </div>
              <div className="flex flex-wrap gap-x-2">
                {ia.suggestions.map((s) => (
                  <button
                    key={s.libelle}
                    type="button"
                    onClick={() => actions.onRepondre(s.brouillon, "Brouillon proposé par l’IA. Relisez avant d’envoyer.")}
                    className="group flex h-11 items-center"
                  >
                    <span className="flex h-[38px] items-center rounded-full border border-bordure bg-surface px-[15px] text-[13.5px] font-semibold whitespace-nowrap group-hover:bg-releve">
                      {s.libelle}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {peutRepondre && (
            <div className="mt-1 hidden flex-wrap gap-2.5 lg:flex">
              <button
                type="button"
                onClick={() => actions.onRepondre()}
                className="flex h-11 items-center gap-2 rounded-full border border-bordure bg-surface px-5 text-[14px] font-bold hover:bg-releve"
              >
                <Icone nom="repondre" taille={17} epaisseur={2} />
                Répondre
              </button>
              <button
                type="button"
                onClick={actions.onTransferer}
                className="flex h-11 items-center gap-2 rounded-full border border-bordure bg-surface px-5 text-[14px] font-bold hover:bg-releve"
              >
                <Icone nom="transferer" taille={17} epaisseur={2} />
                Transférer
              </button>
            </div>
          )}
        </article>
      </div>

      {peutRepondre && (
        <div className="flex shrink-0 gap-2.5 border-t border-bordure bg-surface px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={() => actions.onRepondre()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-sur-accent"
          >
            <Icone nom="repondre" taille={17} epaisseur={2} />
            Répondre
          </button>
          <button
            type="button"
            onClick={actions.onTransferer}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-bordure bg-surface text-[15px] font-bold"
          >
            <Icone nom="transferer" taille={17} epaisseur={2} />
            Transférer
          </button>
        </div>
      )}
    </section>
  );
}

function MessageVue({
  m,
  ouvert,
  onBascule,
  fuseau,
  sujet,
  peutRepondre,
  onRepondre,
  large,
  onGlisserPiece,
  onGlisserFin,
}: {
  m: Message;
  ouvert: boolean;
  onBascule: () => void;
  fuseau: string;
  sujet: string;
  peutRepondre: boolean;
  onRepondre: () => void;
  large: boolean;
  onGlisserPiece: (e: React.DragEvent, p: PieceJointe) => void;
  onGlisserFin: () => void;
}) {
  const quand = dateLongue(m.date, fuseau);
  const vers = `À ${m.a.map((x) => x.nom).join(", ") || "moi"}`;
  const extrait = m.texte.replace(/\s+/g, " ").trim().slice(0, 140);

  if (!ouvert) {
    return (
      <li className="border-b border-bordure">
        <button
          type="button"
          onClick={onBascule}
          aria-expanded={false}
          aria-label={`Afficher le message de ${m.de.nom}, ${quand}`}
          className="flex min-h-16 w-full items-center gap-3 px-0 py-2.5 text-left lg:gap-3.5 lg:px-1"
        >
          <Avatar nom={m.de.nom} taille={38} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex gap-2">
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{m.de.nom}</span>
              <span className="shrink-0 text-[12.5px] text-attenue">{quand}</span>
            </span>
            <span className="truncate text-[13.5px] text-attenue">{extrait}</span>
          </span>
          {m.piecesJointes.length > 0 && (
            <span className="text-attenue">
              <Icone nom="trombone" taille={15} epaisseur={2} />
              <span className="sr-only">Pièces jointes</span>
            </span>
          )}
        </button>
      </li>
    );
  }

  return (
    <li className="border-b border-bordure py-3.5 pb-5 lg:px-1 lg:pt-4 lg:pb-[22px]">
      <div className="flex items-center gap-1 lg:gap-2.5">
        <button
          type="button"
          onClick={onBascule}
          aria-expanded={true}
          aria-label={`Réduire le message de ${m.de.nom}`}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left lg:gap-3.5"
        >
          <Avatar nom={m.de.nom} taille={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-bold">{m.de.nom}</span>
            <span className="truncate text-[12.5px] text-attenue lg:text-[13px]">
              {vers}
              <span className="lg:hidden"> · {quand}</span>
            </span>
          </span>
        </button>
        <span className="hidden shrink-0 text-[12.5px] text-attenue lg:inline">{quand}</span>
        {peutRepondre && <BoutonIcone icone="repondre" libelle={`Répondre à ${m.de.nom}`} onClick={onRepondre} />}
      </div>
      <div className="mt-3 lg:mt-3.5 lg:pl-[54px]">
        <CorpsMessage texte={m.texte} html={m.html} sujet={sujet} />
      </div>
      {m.piecesJointes.length > 0 && (
        <ul role="list" className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0 lg:mt-4 lg:flex-row lg:flex-wrap lg:gap-2.5 lg:pl-[54px]">
          {m.piecesJointes.map((p) => (
            <li
              key={p.id}
              draggable={large}
              onDragStart={large ? (e) => onGlisserPiece(e, p) : undefined}
              onDragEnd={large ? onGlisserFin : undefined}
              aria-roledescription={large ? "pièce jointe déplaçable" : undefined}
              title={large ? "Glissez vers « Écrire » ou une réponse pour la joindre" : undefined}
              className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-bordure bg-releve py-2 pr-2 pl-2 lg:min-h-0 lg:cursor-grab lg:pl-3"
            >
              <span aria-hidden="true" className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-selection text-[10.5px] font-bold text-encre-accent lg:size-9 lg:rounded-[10px]">
                {typeCourt(p.nom, p.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold max-lg:text-[14px]">{p.nom}</span>
                <span className="block text-[12px] text-attenue">{taille(p.taille)}</span>
              </span>
              <a
                href={`/api/pieces/${encodeURIComponent(p.id)}`}
                download={p.nom}
                aria-label={`Télécharger ${p.nom}, ${taille(p.taille)}`}
                title="Télécharger"
                draggable={false}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-texte hover:bg-surface"
              >
                <Icone nom="telecharger" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
