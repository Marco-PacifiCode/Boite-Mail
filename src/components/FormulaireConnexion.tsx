"use client";

import { useActionState, useState } from "react";
import { entrerDemo, seConnecter } from "@/app/actions";

/** Connexion de la démonstration : un bouton, aucun champ (`BOITE_AUTH=demo`). */
export function EntreeDemo({ nom }: { nom: string }) {
  const [etat, action, enCours] = useActionState<{ erreur: string } | undefined>(async () => {
    const r = await entrerDemo();
    if ("ok" in r) {
      window.location.assign("/");
      return undefined;
    }
    return r;
  }, undefined);

  return (
    <form action={action} className="flex w-full max-w-[400px] flex-col gap-[18px]">
      <div>
        <h1 className="m-0 text-[28px] font-bold">Démonstration</h1>
        <p className="m-0 mt-2 text-[15px] leading-normal text-attenue">
          La messagerie de <span translate="no">{nom}</span>, remplie de faux mails. Aucun mot de passe : rien de ce que
          vous verrez n’est réel, et aucun mail ne part.
        </p>
      </div>
      {etat?.erreur && (
        <p role="alert" className="m-0 rounded-xl bg-alerte-fond px-3.5 py-2.5 text-[14px] text-alerte-texte">
          {etat.erreur}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="flex h-[50px] items-center justify-center rounded-[14px] bg-accent text-[15.5px] font-bold text-sur-accent disabled:opacity-70"
      >
        {enCours ? "Ouverture…" : "Entrer dans la démonstration"}
      </button>
    </form>
  );
}

export function FormulaireConnexion({ domaine, exemple }: { domaine: string; exemple: string }) {
  const [oubli, setOubli] = useState(false);
  const [etat, action, enCours] = useActionState(
    async (_: { erreur: string; email: string } | undefined, fd: FormData) => {
      const email = String(fd.get("email") ?? "");
      const r = await seConnecter(email, String(fd.get("motDePasse") ?? ""), fd.get("rester") === "on");
      if ("ok" in r) {
        // Chargement complet : la mise en page racine et le thème du commerce sont rendus à neuf.
        window.location.assign("/");
        return undefined;
      }
      // L'adresse est rendue au formulaire : React le vide après chaque envoi.
      return { ...r, email };
    },
    undefined,
  );

  const champ =
    "h-12 w-full rounded-xl border border-bordure-forte bg-surface px-3.5 text-[16px] text-texte placeholder:text-attenue";

  return (
    <form action={action} className="flex w-full max-w-[400px] flex-col gap-[18px]" noValidate>
      <div>
        <h1 className="m-0 text-[28px] font-bold">Connexion</h1>
        <p className="m-0 mt-2 text-[15px] leading-normal text-attenue">Utilisez votre adresse @{domaine}.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13.5px] font-bold">
          Adresse mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder={exemple}
          defaultValue={etat?.email}
          key={etat?.email}
          className={champ}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="motDePasse" className="text-[13.5px] font-bold">
            Mot de passe
          </label>
          <button
            type="button"
            aria-expanded={oubli}
            aria-controls="aide-oubli"
            onClick={() => setOubli(!oubli)}
            className="min-h-11 text-[13.5px] font-semibold text-encre-accent underline"
          >
            Mot de passe oublié ?
          </button>
        </div>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required placeholder="••••••••" className={champ} />
        {oubli && (
          <p id="aide-oubli" className="m-0 text-[13.5px] leading-normal text-attenue">
            Demandez à votre responsable : il peut vous remettre un nouveau mot de passe provisoire.
          </p>
        )}
      </div>
      <label htmlFor="rester" className="flex min-h-11 items-center gap-2.5 text-[14px]">
        <input id="rester" name="rester" type="checkbox" className="size-[18px] accent-[var(--encre-accent)]" />
        Rester connecté sur cet appareil
      </label>
      {etat?.erreur && (
        <p role="alert" className="m-0 rounded-xl bg-alerte-fond px-3.5 py-2.5 text-[14px] text-alerte-texte">
          {etat.erreur}
        </p>
      )}
      <button
        type="submit"
        disabled={enCours}
        className="flex h-[50px] items-center justify-center rounded-[14px] bg-accent text-[15.5px] font-bold text-sur-accent disabled:opacity-70"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      <p className="m-0 mt-1 text-[13.5px] leading-[1.55] text-attenue">
        Première connexion ? Utilisez le mot de passe provisoire remis par votre responsable ; vous le changerez juste après.
      </p>
    </form>
  );
}
