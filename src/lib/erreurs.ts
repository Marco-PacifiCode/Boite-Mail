export class ErreurAffichable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurAffichable";
  }
}

export type ErreurAction = { erreurAction: string };

export function estErreurAction(v: unknown): v is ErreurAction {
  return typeof v === "object" && v !== null && "erreurAction" in v && typeof v.erreurAction === "string";
}

export async function appel<T>(p: Promise<T | ErreurAction>): Promise<T> {
  const r = await p;
  if (estErreurAction(r)) throw new Error(r.erreurAction);
  return r;
}
