"use client";

import { useCallback, useRef, useState } from "react";
import { aRessourcesDistantes } from "@/lib/mail/html";
import { Icone } from "../Icone";

/**
 * Corps d'un message.
 * - Texte seul : affiché tel quel.
 * - HTML (déjà nettoyé par core_comms) : iframe `sandbox` SANS `allow-scripts` (aucun script ne
 *   s'exécute), et politique de contenu qui bloque toute ressource distante. Les images ne sont
 *   chargées qu'à la demande (« Afficher les images ») : un pixel espion ne part donc pas tout seul.
 *   `allow-same-origin` ne sert qu'à mesurer la hauteur ; sans scripts, il ne donne rien au message.
 */
export function CorpsMessage({ texte, html, sujet }: { texte: string; html: string | null; sujet: string }) {
  const [images, setImages] = useState(false);
  const [hauteur, setHauteur] = useState(120);
  const observateur = useRef<ResizeObserver | null>(null);

  const mesurer = useCallback((f: HTMLIFrameElement | null) => {
    observateur.current?.disconnect();
    if (!f) return;
    const brancher = () => {
      const doc = f.contentDocument;
      if (!doc?.body) return;
      const maj = () => setHauteur(Math.min(Math.max(doc.documentElement.scrollHeight, 60), 6000));
      maj();
      observateur.current?.disconnect();
      observateur.current = new ResizeObserver(maj);
      observateur.current.observe(doc.body);
    };
    f.addEventListener("load", brancher);
    brancher();
  }, []);

  if (!html) {
    return <div className="text-[15px] leading-[1.7] break-words whitespace-pre-line max-lg:text-[15.5px] max-lg:leading-[1.65]">{texte}</div>;
  }

  const distantes = aRessourcesDistantes(html);
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src data: cid:${images ? " https: http:" : ""}`,
    "font-src data:",
    "form-action 'none'",
  ].join("; ");
  const corps = html.replace(/<a\s/gi, '<a rel="noopener noreferrer" target="_blank" ');
  const doc =
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="referrer" content="no-referrer"><base target="_blank">` +
    `<style>html,body{margin:0;padding:0;background:#FFFFFF;color:#1E1B1D;font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-wrap:anywhere}` +
    `body{padding:14px 16px}img{max-width:100%;height:auto}table{max-width:100%}a{color:#1D4ED8}</style>` +
    `</head><body>${corps}</body></html>`;

  return (
    <div className="flex flex-col gap-2">
      {distantes && !images && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-releve px-3 py-1.5 text-[13px] text-attenue">
          <Icone nom="image" taille={16} />
          <span className="min-w-0 flex-1">Images distantes masquées pour protéger votre vie privée.</span>
          <button
            type="button"
            onClick={() => setImages(true)}
            className="min-h-11 rounded-lg px-2 font-bold text-encre-accent underline"
          >
            Afficher les images
          </button>
        </div>
      )}
      <iframe
        key={images ? "avec-images" : "sans-images"}
        ref={mesurer}
        title={`Contenu du message : ${sujet}`}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        srcDoc={doc}
        className="w-full rounded-xl border border-bordure bg-white"
        style={{ height: hauteur, colorScheme: "light" }}
      />
    </div>
  );
}
