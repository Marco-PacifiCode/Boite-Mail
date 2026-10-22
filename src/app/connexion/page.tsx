import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EntreeDemo, FormulaireConnexion } from "@/components/FormulaireConnexion";
import { Logo } from "@/components/boite/commun";
import { lireSession, modeConnexion } from "@/lib/auth";
import { commerceCourant } from "@/lib/commerces";
import { commercePourClient } from "@/lib/vue/client";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion() {
  const commerce = await commerceCourant();
  if (!commerce) notFound();
  if (await lireSession(commerce)) redirect("/");
  const c = commercePourClient(commerce);
  const titre = commerce.connexion?.titre ?? "La messagerie de toute l’équipe.";
  const texte =
    commerce.connexion?.texte ??
    "Vos clients, vos fournisseurs et vos rendez-vous au même endroit, sur ordinateur comme sur téléphone.";

  return (
    <div className="flex min-h-dvh flex-wrap bg-surface text-texte">
      <div className="relative flex min-h-[340px] flex-[1_1_520px] flex-col justify-between gap-10 overflow-hidden bg-panneau-fond p-8 text-panneau-texte sm:p-14">
        <svg
          width="640"
          height="640"
          viewBox="0 0 640 640"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute -right-[220px] -bottom-[220px] opacity-[0.16]"
        >
          {[318, 250, 182, 114].map((r) => (
            <circle key={r} cx="320" cy="320" r={r} stroke="currentColor" strokeWidth="2" />
          ))}
        </svg>
        <div className="relative flex items-center gap-4">
          <Logo commerce={c} taille={56} inverse />
          <div>
            <div translate="no" className="font-titres text-[26px] leading-tight font-semibold">
              {commerce.nom}
            </div>
            {commerce.accroche && <div className="mt-1 text-[14px] opacity-90">{commerce.accroche}</div>}
          </div>
        </div>
        <div className="relative max-w-[460px]">
          <p className="m-0 font-titres text-[34px] leading-[1.12] font-semibold sm:text-[44px]">{titre}</p>
          <p className="m-0 mt-4 text-[16px] leading-relaxed opacity-90">{texte}</p>
        </div>
        <div className="relative text-[14px] font-semibold tracking-[0.02em] opacity-90">{commerce.hote}</div>
      </div>

      <main className="flex flex-[1_1_440px] flex-col items-center justify-center gap-8 px-6 py-14">
        {modeConnexion() === "demo" ? (
          <EntreeDemo nom={commerce.nom} />
        ) : (
          <FormulaireConnexion domaine={commerce.domaine} exemple={commerce.connexion?.exempleAdresse ?? `prenom@${commerce.domaine}`} />
        )}
        <div className="text-[12.5px] text-attenue">Messagerie fournie par PacifiCode</div>
      </main>
    </div>
  );
}
