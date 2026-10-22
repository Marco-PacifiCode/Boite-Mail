# AGENT_BRIEF — Boite-Mail

## État courant (22/10/2026)
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
- Aperçu en ligne en démonstration (faux mails, thème du studio), accordé par Marco (QCM du 22/10) : dépôt public et
  préparation faits, livraison en attente du créneau de 00-Architecture, adresse publique ensuite.
- Adaptateur `core-comms.ts` : contrat reçu de la session Core-Comms (`01-Core-Comms/core/lib/mail/CONTRAT.md` §3, branche
  `claude/entree-mail-unique`, non fusionnée). Remarques envoyées : nom du cookie de session, dossiers suivis/envoyés/
  corbeille, compteurs. Pas de pièce jointe sortante en v1 : masquer le trombone en mode core-comms.
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
