import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MailApp } from "@/components/boite/MailApp";
import { lireSession } from "@/lib/auth";
import { COOKIE_AFFICHAGE, commerceCourant, lireMode } from "@/lib/commerces";
import { mailApi } from "@/lib/mail";
import type { Vue } from "@/lib/mail/types";
import { commercePourClient } from "@/lib/vue/client";

export default async function Accueil() {
  const commerce = await commerceCourant();
  if (!commerce) notFound();
  const utilisateur = await lireSession(commerce);
  if (!utilisateur) redirect("/connexion");

  const api = mailApi(commerce, utilisateur);
  const etat = await api.listerBoites();
  const accueil = etat.boites.find((b) => b.accueil) ?? etat.boites[0];
  const vue: Vue = { type: "boite", id: accueil.id };
  const [liste, parametres] = await Promise.all([api.listerConversations({ vue }), api.lireParametres()]);
  const mode = lireMode((await cookies()).get(COOKIE_AFFICHAGE)?.value);
  const commerceClient = commercePourClient(commerce);
  const commerceAvecBoitesApi = api.capacites.imagesParServeur
    ? { ...commerceClient, boites: etat.boites.map(({ id, adresse, libelle }) => ({ id, adresse, libelle })) }
    : commerceClient;

  return (
    <MailApp
      commerce={commerceAvecBoitesApi}
      utilisateur={{ nom: utilisateur.nom, email: utilisateur.email }}
      etatInitial={etat}
      listeInitiale={liste.conversations}
      vueInitiale={vue}
      parametres={parametres}
      capacites={api.capacites}
      modeInitial={mode}
    />
  );
}
