import "server-only";

import type { Commerce } from "@/lib/commerces";
import type { MailApi, Utilisateur } from "./types";

/**
 * Implémentation par l'API de core_comms (BOITE-ARCHITECTURE.md, « API pour l'appli de boîte »).
 * Pas encore branchée : elle sera écrite quand core_comms exposera `/api/mail/*`.
 */
export function creerCoreCommsApi(commerce: Commerce, utilisateur: Utilisateur): MailApi {
  void commerce;
  void utilisateur;
  throw new Error("Source core-comms non branchée : utilisez BOITE_SOURCE=demo.");
}
