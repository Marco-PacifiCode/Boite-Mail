import { ErreurAffichable } from "@/lib/erreurs";
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
  if (utilisateur.tenantId !== commerce.tenantId) throw new ErreurAffichable("Session expirée : reconnectez-vous.");
  if (sourceDonnees() === "core-comms" && process.env.BOITE_AUTH !== "core-auth") throw new Error("BOITE_SOURCE=core-comms exige COMMS_URL, COMMS_MAIL_APP_KEY et BOITE_AUTH=core-auth");
  return sourceDonnees() === "core-comms"
    ? creerCoreCommsApi(commerce, utilisateur)
    : new DemoMailApi(commerce, utilisateur);
}
