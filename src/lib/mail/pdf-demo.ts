/**
 * Fabrique un petit PDF d'une page, lisible, pour les pièces jointes de démonstration.
 * Texte en Helvetica (WinAnsi) : les caractères hors Latin-1 sont remplacés.
 */
export function pdfDemo(titre: string, lignes: string[]): Uint8Array {
  const propre = (s: string) =>
    s
      .replace(/[‘’]/g, "'")
      .replace(/[“”«»]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/ | /g, " ")
      .replace(/[^\x20-\xFF]/g, "?")
      .replace(/([\\()])/g, "\\$1");

  const flux: string[] = ["BT", "/F1 18 Tf", "56 780 Td", `(${propre(titre)}) Tj`, "/F1 11 Tf", "0 -34 Td"];
  for (const l of lignes) flux.push(`(${propre(l)}) Tj`, "0 -17 Td");
  flux.push("/F1 9 Tf", "0 -20 Td", "(Document de demonstration - donnees fictives.) Tj", "ET");
  const contenu = flux.join("\n");

  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(contenu, "latin1")} >>\nstream\n${contenu}\nendstream`,
  ];

  let sortie = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(Buffer.byteLength(sortie, "latin1"));
    sortie += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(sortie, "latin1");
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) sortie += `${String(p).padStart(10, "0")} 00000 n \n`;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(sortie, "latin1"));
}
