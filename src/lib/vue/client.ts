import "server-only";

import type { Commerce } from "@/lib/commerces";
import type { CommerceClient } from "@/components/boite/commun";

/** Ce que l'interface a besoin de savoir du commerce (rien de privé : ni tenant, ni descriptions Jev). */
export function commercePourClient(c: Commerce): CommerceClient {
  return {
    nom: c.nom,
    accroche: c.accroche,
    domaine: c.domaine,
    fuseau: c.fuseau,
    logo: { initiale: c.theme.logo.initiale, image: c.theme.logo.image },
    boites: c.boites.map((b) => ({ id: b.id, adresse: b.adresse, libelle: b.libelle })),
    libelles: c.libelles.map((l) => ({ id: l.id, nom: l.nom, teinte: l.teinte })),
  };
}
