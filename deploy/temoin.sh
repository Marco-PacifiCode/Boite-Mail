#!/usr/bin/env bash
# Parcours témoin de la boîte mail, joué par ng-deploy SUR LE VPS juste après un déploiement.
# Contrat : 00-Archi-NextGen/_routine/deploy/README.md, section « Parcours témoin ». Variables du moteur :
# TEMOIN_URL (http://127.0.0.1:<port>), TEMOIN_APP, TEMOIN_DEPLOYE, TEMOIN_ID, TEMOIN_ENV_FILE (non lu).
# TEMOIN_HOTE : nom d'hôte public d'un commerce déclaré (par défaut l'aperçu demo-mail.pacificode.nc).
# Sortie : code 0 ET dernière ligne « TEMOIN=OK <résumé> », sinon « TEMOIN=KO <raison> » et code 1.
#
# LECTURE SEULE : uniquement des GET, aucune connexion, aucun envoi. Le commerce vient du nom d'hôte :
#   1. /api/health                     -> 200 et {"ok":true}
#   2. hôte inconnu                    -> 404 (jamais le commerce d'un autre)
#   3. / sans session                  -> redirection vers /connexion (le garde de session tourne)
#   4. /connexion                      -> 200, un formulaire, pas « Boîte introuvable »
#   5. /manifest.webmanifest           -> 200, manifeste propre à l'hôte (start_url)
#   6. fichier statique                -> un JS référencé par /connexion, servi en 200
#   7. /marque/<remontée de dossier>   -> jamais 200
set -u
export LC_ALL=C
: "${TEMOIN_URL:?TEMOIN_URL manquant}"
TEMOIN_URL="${TEMOIN_URL%/}"
HOTE="${TEMOIN_HOTE:-demo-mail.pacificode.nc}"
TMP="$(mktemp -d)" || { echo "TEMOIN=KO mktemp impossible"; exit 1; }
trap 'rm -rf "$TMP"' EXIT
DEBUT=$SECONDS

rouge() { echo "TEMOIN=KO $*"; exit 1; }

# get URL SORTIE HOTE [options curl...] -> imprime le code HTTP (000 si injoignable)
get() {
  local url="$1" out="$2" hote="$3" c; shift 3
  c="$(curl -sS -m 20 -o "$out" -w '%{http_code}' -H "Host: $hote" -H "x-forwarded-host: $hote" -H 'x-forwarded-proto: https' "$@" "$url" 2>/dev/null)"
  echo "${c:-000}"
}

# 1. Santé
code="$(get "$TEMOIN_URL/api/health" "$TMP/health.json" "$HOTE")"
[ "$code" = 200 ] || rouge "/api/health -> $code"
grep -q '"ok":true' "$TMP/health.json" || rouge "/api/health sans ok:true"

# 2. Hôte inconnu : aucune boîte servie
code="$(get "$TEMOIN_URL/connexion" "$TMP/inconnu.html" "temoin-inconnu.invalid")"
[ "$code" = 404 ] || rouge "hôte inconnu -> $code (attendu 404)"

# 3. Garde de session
code="$(curl -sS -m 20 -o /dev/null -D "$TMP/racine.h" -w '%{http_code}' -H "Host: $HOTE" -H "x-forwarded-host: $HOTE" -H 'x-forwarded-proto: https' "$TEMOIN_URL/" 2>/dev/null)"
case "$code" in 302|303|307|308) ;; *) rouge "/ sans session -> ${code:-000} (attendu une redirection)" ;; esac
grep -qi '^location:.*/connexion' "$TMP/racine.h" || rouge "/ sans session ne renvoie pas vers /connexion"

# 4. Page de connexion
code="$(get "$TEMOIN_URL/connexion" "$TMP/connexion.html" "$HOTE")"
[ "$code" = 200 ] || rouge "/connexion -> $code"
grep -q '<form' "$TMP/connexion.html" || rouge "/connexion sans formulaire"
grep -q 'Boîte introuvable' "$TMP/connexion.html" && rouge "/connexion sert « Boîte introuvable » pour $HOTE"

# 5. Manifeste propre à l'hôte
code="$(get "$TEMOIN_URL/manifest.webmanifest" "$TMP/manifest.json" "$HOTE")"
[ "$code" = 200 ] || rouge "/manifest.webmanifest -> $code"
grep -q '"start_url"' "$TMP/manifest.json" || rouge "manifeste sans start_url"

# 6. Fichier statique
js="$(grep -oE '/_next/static/[^"]+\.js' "$TMP/connexion.html" | head -1)"
[ -n "$js" ] || rouge "aucun JS référencé par /connexion"
code="$(get "$TEMOIN_URL$js" "$TMP/fichier.js" "$HOTE")"
[ "$code" = 200 ] || rouge "$js -> $code"

# 7. Pas de remontée de dossier par /marque
code="$(get "$TEMOIN_URL/marque/..%2f..%2fpackage.json" "$TMP/remontee" "$HOTE")"
[ "$code" != 200 ] || rouge "/marque accepte une remontée de dossier"

echo "TEMOIN=OK sante, hote-inconnu-404, garde, connexion, manifeste, statique, marque ($((SECONDS - DEBUT)) s)"
