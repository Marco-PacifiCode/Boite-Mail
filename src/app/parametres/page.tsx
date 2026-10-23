import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { FormulaireParametres } from "@/components/FormulaireParametres";
import { lireSession } from "@/lib/auth";
import { COOKIE_AFFICHAGE, commerceCourant, lireMode } from "@/lib/commerces";
import { mailApi } from "@/lib/mail";

export const metadata: Metadata = { title: "Paramètres" };

export default async function PageParametres() {
  const commerce = await commerceCourant();
  if (!commerce) notFound();
  const utilisateur = await lireSession(commerce);
  if (!utilisateur) redirect("/connexion");
  const api = mailApi(commerce, utilisateur);
  if (!api.capacites.parametres) redirect("/");
  const [parametres, etat] = await Promise.all([api.lireParametres(), api.listerBoites()]);
  return (
    <FormulaireParametres
      initial={parametres}
      boites={etat.boites}
      utilisateur={{ nom: utilisateur.nom, email: utilisateur.email }}
      nomCommerce={commerce.nom}
      modeInitial={lireMode((await cookies()).get(COOKIE_AFFICHAGE)?.value)}
    />
  );
}
