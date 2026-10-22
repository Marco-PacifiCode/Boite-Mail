import { lireSession } from "@/lib/auth";
import { commerceCourant } from "@/lib/commerces";
import { mailApi } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** Téléchargement d'une pièce jointe, après contrôle de l'hôte, de la session et des droits. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const commerce = await commerceCourant();
  if (!commerce) return new Response("Boîte introuvable", { status: 404 });
  const utilisateur = await lireSession(commerce);
  if (!utilisateur) return new Response("Non connecté", { status: 401 });
  const { id } = await ctx.params;
  try {
    const p = await mailApi(commerce, utilisateur).telechargerPieceJointe(id);
    const ascii = p.nom.normalize("NFD").replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "") || "piece-jointe";
    return new Response(new Blob([p.contenu as BlobPart]), {
      headers: {
        "Content-Type": p.type || "application/octet-stream",
        "Content-Length": String(p.contenu.byteLength),
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(p.nom)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Pièce jointe introuvable", { status: 404 });
  }
}
