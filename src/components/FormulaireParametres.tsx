"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { enregistrerParametres, seDeconnecter } from "@/app/actions";
import type { Boite, Parametres } from "@/lib/mail/types";
import { Icone } from "./Icone";
import { appliquerMode } from "./boite/MailApp";

type Mode = "clair" | "sombre" | "auto";

const RUBRIQUES = [
  ["signature", "Signature"],
  ["absence", "Réponse automatique"],
  ["tri", "Tri automatique et spam"],
  ["reponses", "Réponses types"],
  ["ia", "Assistant IA"],
  ["affichage", "Affichage"],
] as const;

function Interrupteur({ actif, onChange, libelle }: { actif: boolean; onChange: (v: boolean) => void; libelle: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      onClick={() => onChange(!actif)}
      className="flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span aria-hidden="true" className={`relative h-[26px] w-[46px] rounded-full transition-colors ${actif ? "bg-encre-accent" : "bg-bordure-forte"}`}>
        <span
          className={`absolute top-[3px] size-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-[left] ${actif ? "left-[23px] bg-surface" : "left-[3px] bg-surface"}`}
        />
      </span>
    </button>
  );
}

function Segments<T extends string>({
  valeur,
  options,
  onChange,
  libelle,
}: {
  valeur: T;
  options: { id: T; nom: string }[];
  onChange: (v: T) => void;
  libelle: string;
}) {
  return (
    <div role="group" aria-label={libelle} className="inline-flex gap-0.5 rounded-[14px] bg-releve p-[3px]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valeur === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-11 rounded-xl px-4 text-[14px] font-semibold ${
            valeur === o.id ? "bg-surface text-texte shadow-[0_1px_3px_rgba(20,14,20,0.14)]" : "text-attenue"
          }`}
        >
          {o.nom}
        </button>
      ))}
    </div>
  );
}

function ListeAdresses({
  titre,
  aide,
  adresses,
  onChange,
}: {
  titre: string;
  aide: string;
  adresses: string[];
  onChange: (a: string[]) => void;
}) {
  const [saisie, setSaisie] = useState("");
  const id = titre.replace(/\W+/g, "-").toLowerCase();
  const ajouter = () => {
    const v = saisie.trim().toLowerCase();
    if (v && !adresses.includes(v)) onChange([...adresses, v]);
    setSaisie("");
  };
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-bordure p-4">
      <div>
        <div className="font-bold">{titre}</div>
        <div className="text-[13px] text-attenue">
          {adresses.length} adresse{adresses.length > 1 ? "s" : ""} · {aide}
        </div>
      </div>
      <ul role="list" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {adresses.map((a) => (
          <li key={a} className="flex items-center gap-1 rounded-full border border-bordure bg-releve pl-3 text-[13px]">
            <span className="break-all">{a}</span>
            <button
              type="button"
              aria-label={`Retirer ${a}`}
              onClick={() => onChange(adresses.filter((x) => x !== a))}
              className="flex size-11 items-center justify-center rounded-full"
            >
              <Icone nom="fermer" taille={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <label htmlFor={`${id}-saisie`} className="sr-only">
          Ajouter une adresse ou un domaine à « {titre} »
        </label>
        <input
          id={`${id}-saisie`}
          type="text"
          inputMode="email"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter();
            }
          }}
          placeholder="adresse@exemple.nc ou exemple.nc"
          className="h-11 min-w-0 flex-1 rounded-xl border border-bordure-forte bg-saisie px-3 text-[15px]"
        />
        <button type="button" onClick={ajouter} className="h-11 shrink-0 rounded-xl border border-bordure-forte px-4 font-bold">
          Ajouter
        </button>
      </div>
    </div>
  );
}

export function FormulaireParametres({
  initial,
  boites,
  utilisateur,
  nomCommerce,
  modeInitial,
}: {
  initial: Parametres;
  boites: Boite[];
  utilisateur: { nom: string; email: string };
  nomCommerce: string;
  modeInitial: Mode;
}) {
  const [p, setP] = useState(initial);
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [boiteSig, setBoiteSig] = useState(boites[0]?.id ?? "");
  const [toast, setToast] = useState("");
  const [enCours, demarrer] = useTransition();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glisse = useRef<number | null>(null);

  const dire = (t: string) => {
    setToast(t);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setToast(""), 3500);
  };
  const maj = <K extends keyof Parametres>(k: K, v: Parametres[K]) => setP((x) => ({ ...x, [k]: v }));
  const enregistrer = () =>
    demarrer(async () => {
      try {
        setP(await enregistrerParametres(p));
        dire("Paramètres enregistrés");
      } catch (e) {
        dire(e instanceof Error ? e.message : "L’enregistrement a échoué.");
      }
    });

  const deplacerType = (de: number, vers: number) => {
    if (vers < 0 || vers >= p.reponsesTypes.length || de === vers) return;
    const t = [...p.reponsesTypes];
    const [x] = t.splice(de, 1);
    t.splice(vers, 0, x);
    maj("reponsesTypes", t);
  };

  const carte = "scroll-mt-6 rounded-[20px] border border-bordure bg-surface p-5 sm:p-6";
  const h2 = "m-0 text-[19px] font-bold";
  const ligne = "flex items-center justify-between gap-4 border-t border-bordure py-3 first-of-type:border-0";
  const champ = "w-full rounded-xl border border-bordure-forte bg-saisie px-3 py-2.5 text-[15px] leading-normal text-texte";

  return (
    <div className="min-h-dvh bg-fond px-4 pt-6 pb-12 text-[14px] text-texte sm:px-6">
      <header className="mx-auto mb-6 flex max-w-[1180px] flex-wrap items-center gap-4">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-bordure bg-surface pr-3.5 pl-2 font-bold text-texte no-underline">
          <Icone nom="gaucheChevron" epaisseur={2} />
          Retour à la boîte
        </Link>
        <div className="min-w-0 flex-[1_1_260px]">
          <h1 className="m-0 text-[26px] font-bold">Paramètres</h1>
          <p className="m-0 mt-1 truncate text-attenue">
            {utilisateur.nom} · {utilisateur.email}
          </p>
        </div>
        <button type="button" onClick={enregistrer} disabled={enCours} className="h-[46px] rounded-xl bg-accent px-[22px] text-[15px] font-bold text-sur-accent disabled:opacity-70">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      </header>

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-start gap-6">
        <nav aria-label="Rubriques des paramètres" className="flex flex-[1_1_220px] flex-col gap-0.5 lg:sticky lg:top-6">
          {RUBRIQUES.map(([id, nom]) => (
            <a key={id} href={`#${id}`} className="flex min-h-11 items-center rounded-xl px-3.5 font-semibold text-texte no-underline hover:bg-releve">
              {nom}
            </a>
          ))}
          <p className="m-0 mx-3.5 mt-4 text-[12.5px] leading-normal text-attenue">
            Le logo, les couleurs et la page de connexion de {nomCommerce} sont réglés par PacifiCode.
          </p>
          <form action={seDeconnecter} className="mt-3">
            <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3.5 font-semibold text-texte hover:bg-releve">
              <Icone nom="sortir" />
              Se déconnecter
            </button>
          </form>
        </nav>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <section id="signature" aria-labelledby="t-signature" className={carte}>
            <h2 id="t-signature" className={h2}>
              Signature
            </h2>
            <p className="m-0 mt-1 text-attenue">Une signature par boîte : elle suit l’adresse d’envoi choisie.</p>
            {boites.length > 1 && (
              <div className="mt-4">
                <label htmlFor="sig-boite" className="mb-1.5 block text-[13.5px] font-bold">
                  Boîte
                </label>
                <select id="sig-boite" value={boiteSig} onChange={(e) => setBoiteSig(e.target.value)} className={`${champ} h-11 py-0`}>
                  {boites.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.libelle} · {b.adresse}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <label htmlFor="sig" className="mt-4 mb-1.5 block text-[13.5px] font-bold">
              Texte de la signature
            </label>
            <textarea
              id="sig"
              rows={4}
              value={p.signatures[boiteSig] ?? ""}
              onChange={(e) => maj("signatures", { ...p.signatures, [boiteSig]: e.target.value })}
              className={champ}
            />
            <div className="mt-2">
              <div className={ligne}>
                <span>Ajouter aux nouveaux messages</span>
                <Interrupteur actif={p.signatureNouveaux} onChange={(v) => maj("signatureNouveaux", v)} libelle="Ajouter la signature aux nouveaux messages" />
              </div>
              <div className={ligne}>
                <span>Ajouter aux réponses et transferts</span>
                <Interrupteur actif={p.signatureReponses} onChange={(v) => maj("signatureReponses", v)} libelle="Ajouter la signature aux réponses et transferts" />
              </div>
            </div>
          </section>

          <section id="absence" aria-labelledby="t-absence" className={carte}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="t-absence" className={h2}>
                  Réponse automatique
                </h2>
                <p className="m-0 mt-1 text-attenue">Pour les congés : chaque expéditeur reçoit ce message une fois.</p>
              </div>
              <Interrupteur actif={p.absence.active} onChange={(v) => maj("absence", { ...p.absence, active: v })} libelle="Activer la réponse automatique" />
            </div>
            {p.absence.active && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-[1_1_180px]">
                    <label htmlFor="abs-du" className="mb-1.5 block text-[13.5px] font-bold">
                      Du
                    </label>
                    <input id="abs-du" type="date" value={p.absence.du} onChange={(e) => maj("absence", { ...p.absence, du: e.target.value })} className={`${champ} h-11 py-0`} />
                  </div>
                  <div className="flex-[1_1_180px]">
                    <label htmlFor="abs-au" className="mb-1.5 block text-[13.5px] font-bold">
                      Au
                    </label>
                    <input id="abs-au" type="date" value={p.absence.au} onChange={(e) => maj("absence", { ...p.absence, au: e.target.value })} className={`${champ} h-11 py-0`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="abs-msg" className="mb-1.5 block text-[13.5px] font-bold">
                    Message
                  </label>
                  <textarea id="abs-msg" rows={4} value={p.absence.message} onChange={(e) => maj("absence", { ...p.absence, message: e.target.value })} className={champ} />
                </div>
                <label htmlFor="abs-contacts" className="flex min-h-11 items-center gap-2.5">
                  <input
                    id="abs-contacts"
                    type="checkbox"
                    checked={p.absence.contactsSeulement}
                    onChange={(e) => maj("absence", { ...p.absence, contactsSeulement: e.target.checked })}
                    className="size-[18px] accent-[var(--encre-accent)]"
                  />
                  Répondre seulement aux expéditeurs de confiance
                </label>
              </div>
            )}
          </section>

          <section id="tri" aria-labelledby="t-tri" className={carte}>
            <h2 id="t-tri" className={h2}>
              Tri automatique et spam
            </h2>
            <div className="mt-3">
              <div className={ligne}>
                <div>
                  <div className="font-bold">Tri par Jev</div>
                  <div className="text-[13px] text-attenue">Range les nouveaux mails dans la bonne boîte et le bon libellé, et apprend de vos corrections.</div>
                </div>
                <Interrupteur actif={p.tri.triIA} onChange={(v) => maj("tri", { ...p.tri, triIA: v })} libelle="Activer le tri par Jev" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bordure py-3">
                <div className="min-w-0 flex-[1_1_240px]">
                  <div className="font-bold">Filtre anti-spam</div>
                  <div className="text-[13px] text-attenue">Arnaques, faux messages de banque et publicités vont dans Indésirables.</div>
                </div>
                <Segments
                  libelle="Sévérité du filtre anti-spam"
                  valeur={p.tri.severite}
                  options={[
                    { id: "souple", nom: "Souple" },
                    { id: "normal", nom: "Normal" },
                    { id: "strict", nom: "Strict" },
                  ]}
                  onChange={(v) => maj("tri", { ...p.tri, severite: v })}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ListeAdresses titre="Expéditeurs bloqués" aide="vont toujours dans Indésirables" adresses={p.tri.bloques} onChange={(a) => maj("tri", { ...p.tri, bloques: a })} />
              <ListeAdresses titre="Expéditeurs de confiance" aide="jamais classés en spam" adresses={p.tri.confiance} onChange={(a) => maj("tri", { ...p.tri, confiance: a })} />
            </div>
          </section>

          <section id="reponses" aria-labelledby="t-reponses" className={carte}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="t-reponses" className={h2}>
                Réponses types
              </h2>
              <span className="text-[13px] text-attenue">Glissez pour choisir l’ordre, ou utilisez les flèches.</span>
            </div>
            <p className="m-0 mt-1 text-[13px] text-attenue">« {"{prenom}"} » est remplacé par le prénom du correspondant quand il est connu.</p>
            <ol role="list" className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
              {p.reponsesTypes.map((t, i) => (
                <li
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    glisse.current = i;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", t.titre);
                  }}
                  onDragOver={(e) => {
                    if (glisse.current !== null) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (glisse.current !== null) deplacerType(glisse.current, i);
                    glisse.current = null;
                  }}
                  aria-roledescription="réponse type déplaçable"
                  className="flex gap-2 rounded-2xl border border-bordure p-3"
                >
                  <span aria-hidden="true" className="mt-2.5 hidden cursor-grab text-attenue sm:block">
                    <Icone nom="poignee" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <label htmlFor={`rt-titre-${i}`} className="sr-only">
                      Titre de la réponse type {i + 1}
                    </label>
                    <input
                      id={`rt-titre-${i}`}
                      value={t.titre}
                      onChange={(e) => maj("reponsesTypes", p.reponsesTypes.map((x, j) => (j === i ? { ...x, titre: e.target.value } : x)))}
                      className={`${champ} h-11 py-0 font-bold`}
                    />
                    <label htmlFor={`rt-corps-${i}`} className="sr-only">
                      Texte de la réponse type {i + 1}
                    </label>
                    <textarea
                      id={`rt-corps-${i}`}
                      rows={4}
                      value={t.corps}
                      onChange={(e) => maj("reponsesTypes", p.reponsesTypes.map((x, j) => (j === i ? { ...x, corps: e.target.value } : x)))}
                      className={champ}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <button type="button" aria-label={`Monter « ${t.titre} »`} disabled={i === 0} onClick={() => deplacerType(i, i - 1)} className="flex size-11 items-center justify-center rounded-xl disabled:opacity-30">
                      <Icone nom="hautChevron" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descendre « ${t.titre} »`}
                      disabled={i === p.reponsesTypes.length - 1}
                      onClick={() => deplacerType(i, i + 1)}
                      className="flex size-11 items-center justify-center rounded-xl disabled:opacity-30"
                    >
                      <Icone nom="basChevron" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer « ${t.titre} »`}
                      onClick={() => maj("reponsesTypes", p.reponsesTypes.filter((_, j) => j !== i))}
                      className="flex size-11 items-center justify-center rounded-xl"
                    >
                      <Icone nom="corbeille" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => maj("reponsesTypes", [...p.reponsesTypes, { titre: "Nouvelle réponse", corps: "Bonjour {prenom},\n\n" }])}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-bordure-forte px-4 font-bold"
            >
              <Icone nom="plus" epaisseur={2} />
              Ajouter une réponse type
            </button>
          </section>

          <section id="ia" aria-labelledby="t-ia" className={carte}>
            <h2 id="t-ia" className={h2}>
              Assistant IA
            </h2>
            <div className="mt-3">
              <div className={ligne}>
                <div>
                  <div className="font-bold">Aide à la rédaction</div>
                  <div className="text-[13px] text-attenue">Brouillons, reformulation, correction. Rien ne part sans votre clic.</div>
                </div>
                <Interrupteur actif={p.ia.redaction} onChange={(v) => maj("ia", { ...p.ia, redaction: v })} libelle="Activer l’aide à la rédaction" />
              </div>
              <div className={ligne}>
                <div>
                  <div className="font-bold">Résumés et réponses suggérées</div>
                  <div className="text-[13px] text-attenue">Un résumé en haut des conversations, des réponses en un clic.</div>
                </div>
                <Interrupteur actif={p.ia.resumes} onChange={(v) => maj("ia", { ...p.ia, resumes: v })} libelle="Activer les résumés et réponses suggérées" />
              </div>
            </div>
          </section>

          <section id="affichage" aria-labelledby="t-affichage" className={carte}>
            <h2 id="t-affichage" className={h2}>
              Affichage
            </h2>
            <p className="m-0 mt-1 mb-3 text-attenue">Propre à cet appareil, appliqué tout de suite.</p>
            <Segments
              libelle="Mode d’affichage"
              valeur={mode}
              options={[
                { id: "clair", nom: "Clair" },
                { id: "sombre", nom: "Sombre" },
                { id: "auto", nom: "Automatique" },
              ]}
              onChange={(m) => {
                setMode(m);
                appliquerMode(m);
              }}
            />
          </section>
        </div>
      </div>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-6 z-50 flex justify-center">
        {toast && (
          <div className="anim-monte rounded-xl bg-toast-fond px-[18px] py-3 text-[14px] font-semibold text-toast-texte shadow-[0_12px_32px_rgba(20,14,20,0.22)]">{toast}</div>
        )}
      </div>
    </div>
  );
}
