import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Logos et icônes des commerces, servis depuis un dossier privé du serveur (`BOITE_MARQUES_DOSSIER`).
 * Le dépôt est public : aucune marque de commerce n'y est versionnée (décision Marco, 22/10).
 * En développement, à défaut : `config/marques` (ignoré par git).
 */
const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function dossier(): string | null {
  const env = process.env.BOITE_MARQUES_DOSSIER;
  if (env) return path.resolve(env);
  return process.env.NODE_ENV === "production" ? null : path.resolve("config/marques");
}

export async function GET(_req: Request, ctx: { params: Promise<{ chemin: string[] }> }) {
  const racine = dossier();
  const { chemin } = await ctx.params;
  const type = TYPES[path.extname(chemin.at(-1) ?? "").toLowerCase()];
  if (!racine || !type || chemin.some((p) => !/^[a-z0-9][a-z0-9._-]*$/i.test(p))) {
    return new Response("Introuvable", { status: 404 });
  }
  const fichier = path.resolve(racine, ...chemin);
  if (!fichier.startsWith(racine + path.sep)) return new Response("Introuvable", { status: 404 });
  try {
    const contenu = await readFile(fichier);
    return new Response(contenu, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        // Un SVG ouvert seul ne doit exécuter aucun script.
        ...(type === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
