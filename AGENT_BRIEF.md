# AGENT_BRIEF — Boite-Mail

## État courant (23/10/2026)
- **Aperçu en ligne** : https://demo-mail.pacificode.nc (faux mails du studio, bouton « Entrer », page non indexée),
  livré le 22/10 à 20:03 NC, parcours témoin vert. Rien n'est relié aux vrais mails.
- Appli de boîte mail unique de l'écosystème (Next 16.2.7, App Router, Tailwind 4), dépôt public sans secret.
- Commerce choisi par l'en-tête `host` ; configuration JSON hors dépôt (`BOITE_COMMERCES_FICHIER`).
  Exemple versionné : `config/commerces.exemple.json` (Salon Opaline, fictif, sur `localhost`) — le seul commerce
  du dépôt. Vrais commerces (liste, marques, démos) hors dépôt : `BOITE_COMMERCES_FICHIER`, `BOITE_MARQUES_DOSSIER`
  (servi par `/marque/...`), `BOITE_DEMO_DOSSIER` (décision Marco du 22/10 : le dépôt public ne montre aucun client).
- Données : démonstration en mémoire (`BOITE_SOURCE=demo`, défaut) ou core_comms (`BOITE_SOURCE=core-comms`, exige
  `BOITE_AUTH=core-auth`, `COMMS_URL`, `COMMS_MAIL_APP_KEY`). Adaptateur `src/lib/mail/core-comms.ts` écrit le 23/10 en
  face de `01-Core-Comms` `core/lib/mail/CONTRAT.md` §3, essayé contre `scripts/faux-core-comms.mjs` ; **jamais branché
  sur le vrai core_comms**. `MailApi.capacites` masque ce que la source ne fournit pas (suivis, envoyés, brouillons,
  corbeille, compteurs, trombone, IA, paramètres) ; la démo garde tout.
- Erreurs des server actions : rendues en valeur (`{ erreurAction }`, `src/lib/erreurs.ts`, `appel()` côté client), car
  Next 16 masque en production le message d'une erreur levée. Seules les `ErreurAffichable` montrent leur texte.
- Connexion : `BOITE_AUTH=demo` (bouton « Entrer », aucun champ) ou `core-auth` (POST /api/login, tenant vérifié,
  jeton gardé dans le cookie signé HMAC pour core_comms). Essayé contre un faux core_auth local le 22/10.
- Écrans : boîte (ordinateur ≥ 1024 px / téléphone), connexion, paramètres. Agenda et Contacts masqués.

## En cours / à faire
- Mise en service de mail.studiokdanse.nc : clé `COMMS_MAIL_APP_KEY`, vhost, DNS, livraison — après le créneau
  Core-Comms du 23/10, chacun avec son QCM. Avant : liste des accès par personne (MailboxAccess) et comptes du studio
  dans core_auth (à demander à Marco) ; double authentification (totp) non gérée.
- Core-Comms v1.1 (accepté le 23/10, après sa livraison) : `from`, `snippet`, `messageCount`, `attachmentCount`,
  `firstAttachmentName`, `hasInbound`, `hasOutbound` dans `threads[]` ; l'adaptateur les lit déjà, repli sinon.
  v2 : suivis, envoyés, corbeille, compteurs « à trier » et indésirables.
- Lecture d'un fil en core-comms : `ouvrirConversation` lit le détail deux fois (core_comms le marque lu à chaque
  lecture) — à alléger.
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
- 23/10 : adaptateur core_comms + masquage (demande de Marco : « sur sa branche, sans rien mettre en ligne ») ; erreurs des
  actions rendues en valeur. Essayé en build de production contre faux core_comms + faux core_auth : boîtes, fils, images
  `comms-pj:` et distantes, réponse, 409 en français, session expirée → /connexion ; démo inchangée. Rien en ligne.
