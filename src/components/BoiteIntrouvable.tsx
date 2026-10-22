/** Page neutre pour un hôte inconnu : aucun nom, aucun thème, aucune donnée d'un commerce. */
export function BoiteIntrouvable() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="m-0 text-2xl font-bold">Boîte introuvable</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-attenue">
          Aucune messagerie n’est ouverte à cette adresse. Vérifiez le lien que l’on vous a donné.
        </p>
      </div>
    </main>
  );
}
