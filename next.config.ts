import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Livrable autonome pour ng-deploy (ARTIFACT_TYPE=next-standalone).
  output: "standalone",
  // Les lectures de fichiers par chemin variable font tracer config/ : la configuration privée
  // des commerces (ignorée par git) ne doit jamais entrer dans le livrable.
  outputFileTracingExcludes: {
    "*": ["config/commerces.local.json", "config/demo/**", "config/marques/**"],
  },
  // Les commerces se testent en local sur <alias>.localhost:3000.
  allowedDevOrigins: ["*.localhost"],
  experimental: {
    // Pièces jointes envoyées par la rédaction (server action).
    serverActions: { bodySizeLimit: "15mb" },
  },
  poweredByHeader: false,
};

export default nextConfig;
