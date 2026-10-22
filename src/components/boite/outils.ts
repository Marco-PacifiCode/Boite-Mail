/** Petits utilitaires d'affichage, partagés par les composants de la boîte (côté client). */

function jourCivil(d: Date, fuseau: string): number {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(v("year"), v("month") - 1, v("day")) / 86_400_000;
}

/** Écart en jours civils entre la date et aujourd'hui (0 = aujourd'hui, 1 = hier). */
export function joursDepuis(iso: string, fuseau: string, maintenant = new Date()): number {
  return jourCivil(maintenant, fuseau) - jourCivil(new Date(iso), fuseau);
}

const heure = (d: Date, fuseau: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, hour: "2-digit", minute: "2-digit" }).format(d);

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Heure courte de la liste : « 08:42 », « Hier », « Lun. », « 12 oct. ». */
export function dateCourte(iso: string, fuseau: string): string {
  const d = new Date(iso);
  const j = joursDepuis(iso, fuseau);
  if (j <= 0) return heure(d, fuseau);
  if (j === 1) return "Hier";
  if (j < 7) return majuscule(new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, weekday: "short" }).format(d));
  return new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, day: "numeric", month: "short" }).format(d);
}

/** Date d'un message : « Aujourd’hui à 08:42 », « Lundi à 18:12 », « Jeu. 16 oct. à 18:20 ». */
export function dateLongue(iso: string, fuseau: string): string {
  const d = new Date(iso);
  const j = joursDepuis(iso, fuseau);
  const h = heure(d, fuseau);
  if (j <= 0) return `Aujourd’hui à ${h}`;
  if (j === 1) return `Hier à ${h}`;
  if (j < 7) return `${majuscule(new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, weekday: "long" }).format(d))} à ${h}`;
  const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, weekday: "short", day: "numeric", month: "short" }).format(d);
  return `${majuscule(jour)} à ${h}`;
}

export type Groupe = { cle: string; libelle: string };

export function groupeDe(iso: string, fuseau: string): Groupe {
  const j = joursDepuis(iso, fuseau);
  if (j <= 0) return { cle: "a", libelle: "Aujourd’hui" };
  if (j === 1) return { cle: "b", libelle: "Hier" };
  if (j < 7) return { cle: "c", libelle: "Plus tôt cette semaine" };
  return { cle: "d", libelle: "Plus ancien" };
}

export function taille(octets: number): string {
  if (octets >= 1_048_576) return `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(octets / 1024))} Ko`;
}

/** Initiales et teinte d'avatar (6 teintes, stables pour un même nom). */
export function avatar(nom: string): { initiales: string; teinte: number } {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) % 9973;
  const mots = nom.split(/\s+/).filter((w) => w.length > 2);
  const initiales = (mots.length ? mots : [nom || "?"])
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
  return { initiales, teinte: h % 6 };
}

export function typeCourt(nom: string, mime: string): string {
  if (/^image\//.test(mime) || /\.(jpe?g|png|webp|gif|heic)$/i.test(nom)) return "IMG";
  const ext = /\.([a-z0-9]{2,4})$/i.exec(nom)?.[1];
  return (ext ?? "FIC").toUpperCase().slice(0, 4);
}
