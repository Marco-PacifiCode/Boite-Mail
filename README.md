# Boîte mail PacifiCode

Application web de messagerie des commerces de l’écosystème PacifiCode. Un seul code pour tous :
le commerce (nom, thème, boîtes, libellés) est choisi d’après le **nom d’hôte** de la requête.
Chaque commerce ouvre sa boîte sur `mail.<son domaine>` ; sa marque et ses boîtes vivent hors dépôt.

L’application n’a ni base de données, ni clé Resend, ni accès direct à l’IA : tout passe, côté
serveur, par l’API de core_comms (pas encore branchée ; une démonstration en mémoire la remplace).
Architecture et contrat : `BOITE-ARCHITECTURE.md` (dossier `mail-pacificode`).

## Variables d’environnement

Voir `.env.example`. Aucune n’est secrète dans ce dépôt.

| Variable | Rôle |
|---|---|
| `BOITE_COMMERCES_FICHIER` | Fichier JSON des commerces, **hors dépôt** en production. En développement, à défaut : `config/commerces.local.json`, puis `config/commerces.exemple.json`. |
| `BOITE_MARQUES_DOSSIER` | Dossier privé des logos et icônes des commerces, servis par `/marque/<commerce>/<fichier>`. Hors dépôt ; en développement, à défaut : `config/marques`. |
| `BOITE_SOURCE` | `demo` (par défaut, données en mémoire) ou `core-comms` (pas encore branché). |
| `BOITE_SESSION_CLE` | Clé de signature du cookie de session (32 caractères ou plus). **Obligatoire en production** ; en développement, sans valeur : clé aléatoire à chaque démarrage. |
| `BOITE_AUTH` | `demo` (par défaut) ou `core-auth`. |
| `CORE_AUTH_URL` | Adresse de core_auth, par exemple `http://127.0.0.1:3102` sur le VPS. |
| `CORE_AUTH_API_KEY` | Clé d'application core_auth de la boîte, envoyée en `X-Core-Key`. Elle vit dans le `.env` du serveur, jamais dans le dépôt. |

### Connexion core_auth

Avec `BOITE_AUTH=core-auth`, la connexion appelle `POST /api/login` de core_auth avec le `tenantId` du commerce de l'hôte. Une réponse dont le tenant diffère est refusée. Le jeton de session rendu par core_auth (`session.jwt`) est gardé dans le cookie signé `httpOnly` de la boîte, pour être transmis à core_comms. La session ne dure jamais plus longtemps que ce jeton. Les comptes à double authentification (`totp_requis`) ne sont pas encore pris en charge.

Un hôte absent du fichier affiche « Boîte introuvable », jamais le commerce d’un autre.

## Lancer en local

```bash
npm install
cp config/commerces.exemple.json config/commerces.local.json   # fichier ignoré par git
npm run dev
```

- `http://localhost:3000` : Salon Opaline (commerce fictif de la maquette) ;
- `http://<alias>.localhost:3000` : un commerce déclaré dans `config/commerces.local.json`, avec sa marque dans `config/marques/<slug>/` et sa démo dans `config/demo/<slug>.json` (tous ignorés par git).

En démonstration (`BOITE_AUTH=demo`), la connexion est un bouton « Entrer dans la démonstration », sans aucun champ : personne n’y tape un vrai mot de passe.

## Où est quoi

| Chemin | Rôle |
|---|---|
| `src/lib/commerces/` | Type `Commerce`, chargement du JSON, résolution par l’hôte, thème (jetons clairs et sombres) |
| `src/lib/mail/` | Types du contrat, interface `MailApi`, démonstration (`demo.ts`), `core-comms.ts` à écrire |
| `src/lib/auth/` | Connexion et session ; `verifierIdentifiants` est la seule fonction à remplacer pour core_auth |
| `src/app/actions.ts` | Server actions : seul passage entre l’interface et les données |
| `src/components/boite/` | Interface de la boîte (ordinateur au-dessus de 1024 px, téléphone en dessous) |
| `src/app/manifest.ts` | Manifeste de l’appli installable, propre à chaque hôte |

Vérifications : `npx tsc --noEmit`, `npm run lint`, `npm run build`. Santé : `GET /api/health`.

## Déploiement

Livrable `next-standalone` (`output: "standalone"`), livré par `ng-deploy` (cible `boite-mail`). La configuration
privée des commerces n'entre jamais dans le livrable (`outputFileTracingExcludes`) : elle vit sur le serveur, à côté
du `.env`. Après chaque livraison, `deploy/temoin.sh` rejoue le parcours témoin en lecture seule (santé, hôte
inconnu en 404, garde de session, connexion, manifeste, fichiers statiques, `/marque` sans remontée de dossier).
