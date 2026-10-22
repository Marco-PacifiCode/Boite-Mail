import type { ModificationConversation, ResumeConversation, Vue } from "./types";

/**
 * Règle d'appartenance d'une conversation à une vue. Partagée par la démo (côté serveur) et
 * par l'interface (mise à jour immédiate de la liste avant la réponse du serveur).
 */
export function dansVue(c: ResumeConversation, v: Vue): boolean {
  switch (v.type) {
    case "boite":
      return c.boiteId === v.id && !c.aTrier && !c.archive && !c.indesirable && !c.supprime && !c.brouillon && c.aRecu;
    case "aTrier":
      return c.aTrier && !c.archive && !c.indesirable && !c.supprime;
    case "libelle":
      return c.libelles.includes(v.id) && !c.indesirable && !c.supprime;
    case "dossier":
      switch (v.id) {
        case "suivis":
          return c.suivi && !c.indesirable && !c.supprime;
        case "envoyes":
          return c.aEcrit && !c.supprime;
        case "brouillons":
          return c.brouillon && !c.supprime;
        case "archives":
          return c.archive && !c.indesirable && !c.supprime;
        case "indesirables":
          return c.indesirable && !c.supprime;
        case "corbeille":
          return c.supprime;
      }
  }
  return false;
}

/** Applique une modification à un résumé (même logique que le serveur, sans le journal). */
export function appliquer(c: ResumeConversation, m: ModificationConversation): ResumeConversation {
  const r = { ...c };
  if (m.boiteId !== undefined) {
    if (m.boiteId !== c.boiteId) r.corrige = true;
    r.boiteId = m.boiteId;
    r.aTrier = false;
  }
  if (m.libelles !== undefined) {
    if (c.verdict?.libelles.length && m.libelles.join(",") !== c.libelles.join(",")) r.corrige = true;
    r.libelles = [...m.libelles];
  }
  if (m.lu !== undefined) r.lu = m.lu;
  if (m.archive !== undefined) r.archive = m.archive;
  if (m.indesirable !== undefined) r.indesirable = m.indesirable;
  if (m.suivi !== undefined) r.suivi = m.suivi;
  if (m.supprime !== undefined) r.supprime = m.supprime;
  return r;
}

/** Modification inverse, pour « Annuler ». */
export function inverse(c: ResumeConversation, m: ModificationConversation): ModificationConversation {
  const inv: ModificationConversation = {};
  if (m.boiteId !== undefined) inv.boiteId = c.boiteId;
  if (m.libelles !== undefined) inv.libelles = [...c.libelles];
  for (const k of ["lu", "archive", "indesirable", "suivi", "supprime"] as const) {
    if (m[k] !== undefined) inv[k] = c[k];
  }
  return inv;
}
