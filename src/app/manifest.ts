import type { MetadataRoute } from "next";
import { commerceCourant } from "@/lib/commerces";
import { couleurSure } from "@/lib/commerces/theme";

/** Manifeste de l'appli installable, propre à chaque hôte (lu à chaque requête : `headers()`). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const c = await commerceCourant();
  if (!c) {
    return {
      name: "Boîte mail",
      short_name: "Boîte mail",
      start_url: "/",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#4A4448",
      icons: [{ src: "/commerces/neutre.svg", sizes: "any", type: "image/svg+xml" }],
    };
  }
  const type = (src: string) =>
    src.endsWith(".svg") ? "image/svg+xml" : src.endsWith(".png") ? "image/png" : src.endsWith(".ico") ? "image/x-icon" : undefined;
  const { icones } = c.theme;
  return {
    id: "/",
    name: `${c.nom} · Messagerie`,
    short_name: c.nom,
    description: `Messagerie de ${c.nom}`,
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: couleurSure(c.theme.fondPwa, "#FFFFFF"),
    theme_color: couleurSure(c.theme.couleurPwa, "#4A4448"),
    icons: [
      { src: icones.icone192, sizes: "192x192", type: type(icones.icone192), purpose: "any" },
      { src: icones.icone512, sizes: "512x512", type: type(icones.icone512), purpose: "any" },
      ...(icones.apple ? [{ src: icones.apple, sizes: "180x180", type: "image/png" }] : []),
    ],
  };
}
