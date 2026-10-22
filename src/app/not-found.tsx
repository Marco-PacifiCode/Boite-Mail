import Link from "next/link";
import { BoiteIntrouvable } from "@/components/BoiteIntrouvable";
import { commerceCourant } from "@/lib/commerces";

export default async function NonTrouve() {
  const c = await commerceCourant();
  if (!c) return <BoiteIntrouvable />;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="m-0 text-2xl font-bold">Page introuvable</h1>
        <p className="mt-3 text-[15px] text-attenue">Cette page n’existe pas dans la messagerie de {c.nom}.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 font-bold text-sur-accent no-underline">
          Retour à la boîte
        </Link>
      </div>
    </main>
  );
}
