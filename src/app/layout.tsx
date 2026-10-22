import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { COOKIE_AFFICHAGE, commerceCourant, lireMode } from "@/lib/commerces";
import { couleurSure, feuilleTheme } from "@/lib/commerces/theme";
import { classesPolices, pilePolice } from "@/lib/polices";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const c = await commerceCourant();
  if (!c) {
    return { title: "Boîte introuvable", robots: { index: false, follow: false } };
  }
  return {
    title: { default: `${c.nom} · Messagerie`, template: `%s · ${c.nom}` },
    description: `Messagerie de ${c.nom}`,
    applicationName: c.nom,
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: c.theme.icones.favicon },
        ...(c.theme.icones.icone192 !== c.theme.icones.favicon
          ? [{ url: c.theme.icones.icone192, type: c.theme.icones.icone192.endsWith(".svg") ? "image/svg+xml" : undefined }]
          : []),
      ],
      apple: c.theme.icones.apple ?? c.theme.icones.icone192,
    },
    appleWebApp: { capable: true, title: c.nom, statusBarStyle: "default" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const c = await commerceCourant();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: couleurSure(c?.theme.couleurPwa, "#4A4448"),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const c = await commerceCourant();
  const mode = lireMode((await cookies()).get(COOKIE_AFFICHAGE)?.value);
  const polices =
    `:root{--police-texte:${pilePolice(c?.theme.polices.texte, "manrope")};` +
    `--police-titres:${pilePolice(c?.theme.polices.titres, "manrope")};}`;
  return (
    <html lang="fr" data-mode={mode} className={classesPolices} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: feuilleTheme(c) + polices }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
