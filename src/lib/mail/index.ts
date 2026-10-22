import "server-only";

import type { Commerce } from "@/lib/commerces";
import { creerCoreCommsApi } from "./core-comms";
import { DemoMailApi } from "./demo";
import type { MailApi, Utilisateur } from "./types";

export type * from "./types";

/** Source des données : `demo` (par défaut, en mémoire) ou `core-comms`. */
export function sourceDonnees(): "demo" | "core-comms" {
  return process.env.BOITE_SOURCE === "core-comms" ? "core-comms" : "demo";
}

/** Accès aux données pour un utilisateur d'un commerce. Côté serveur uniquement. */
export function mailApi(commerce: Commerce, utilisateur: Utilisateur): MailApi {
  if (utilisateur.tenantId !== commerce.tenantId) throw new Error("Session d’un autre commerce");
  return sourceDonnees() === "core-comms"
    ? creerCoreCommsApi(commerce, utilisateur)
    : new DemoMailApi(commerce, utilisateur);
}
