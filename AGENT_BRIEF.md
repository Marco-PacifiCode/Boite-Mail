# AGENT_BRIEF — Boite-Mail

## État courant (22/10/2026)
- **Aperçu en ligne** : https://demo-mail.pacificode.nc (faux mails du studio, bouton « Entrer », page non indexée),
  livré le 22/10 à 20:03 NC, parcours témoin vert. Rien n'est relié aux vrais mails.
- Appli de boîte mail unique de l'écosystème (Next 16.2.7, App Router, Tailwind 4), dépôt public sans secret.
- Commerce choisi par l'en-tête `host` ; configuration JSON hors dépôt (`BOITE_COMMERCES_FICHIER`).
  Exemple versionné : `config/commerces.exemple.json` (Salon Opaline, fictif, sur `localhost`) — le seul commerce
  du dépôt. Vrais commerces (liste, marques, démos) hors dépôt : `BOITE_COMMERCES_FICHIER`, `BOITE_MARQUES_DOSSIER`
  (servi par `/marque/...`), `BOITE_DEMO_DOSSIER` (décision Marco du 22/10 : le dépôt public ne montre aucun client).
- Données : démonstration en mémoire (`BOITE_SOURCE=demo`) ; `src/lib/mail/core-comms.ts` lève « non branché ».
- Connexion : `BOITE_AUTH=demo` (tout mot de passe non vide) ou `core-auth` (POST /api/login, tenant vérifié,
  jeton gardé dans le cookie signé HMAC pour core_comms). Essayé contre un faux core_auth local le 22/10.
- Écrans : boîte (ordinateur ≥ 1024 px / téléphone), connexion, paramètres. Agenda et Contacts masqués.

## En cours / à faire
- Adaptateur `core-comms.ts`, dans ce dépôt et sur sa propre branche, en face de `01-Core-Comms` `core/lib/mail/CONTRAT.md`
  §3 (citer le chemin, jamais un SHA : la branche Core-Comms est rebasée le 23/10). Le cookie : renvoyer
  `session.cookieName` tel quel dans `X-Session-Cookie-Name`. En v1, masquer en mode core-comms les dossiers suivis,
  envoyés et corbeille, les compteurs « à trier » et indésirables, et le trombone (pas de pièce jointe sortante) ;
  Core-Comms les ajoute en v2. Clé `COMMS_MAIL_APP_KEY`, vhost, DNS et mise en ligne de mail.studiokdanse.nc : après le
  créneau Core-Comms, chacun avec son QCM.
- Implémentation `core-comms` quand l'API `/api/mail/*` existera (jeton core_auth transmis, amendement 1).
- Extensions de contrat à demander à core_comms : compteurs par dossier, `suivi` et `supprime` dans le PATCH,
  stockage des paramètres utilisateur, brouillons.
- Résumé et rédaction IA : aujourd'hui simulés par la démo ; à brancher sur core_ai.

## Décisions
- 22/10 (Marco) : la démonstration s'ouvre par un bouton, sans aucun champ d'identifiant.
- Référence : `C:\dev\mail-pacificode\BOITE-ARCHITECTURE.md` et la maquette `maquette/project/`.

## Dernières actions
- 22/10 : première version de l'interface et de la couche de données (ng-designer).
- 22/10 : connexion core_auth ; rechargement complet après connexion (le thème restait celui par défaut) ;
  marques et démos des vrais commerces sorties du dépôt.
- 22/10 : démonstration sans mot de passe (bouton « Entrer dans la démonstration », décision Marco : personne n'y
  tape un vrai mot de passe) ; livrable autonome sans la configuration privée ; parcours témoin `deploy/temoin.sh`.
- 22/10 : dépôt GitHub public ouvert avec un historique repris en un seul commit (les premiers commits contenaient des
  données du studio ; l'historique d'origine reste en sauvegarde locale, jamais publié).
- 22/10 : aperçu livré (QCM de Marco, créneau 00-Architecture) : témoin vert, faux mails seulement vérifiés, adresse publique
  ouverte juste après.
