import { createServer } from "node:http";

const port = Number(process.env.FAUX_COMMS_PORT ?? 3998);
const key = process.env.FAUX_COMMS_CLE ?? "cle-essai-locale";
const boxes = [{ id: "11111111-1111-4111-8111-111111111111", address: "contact@exemple.nc", label: "Contact", unread: 1 }, { id: "22222222-2222-4222-8222-222222222222", address: "facturation@exemple.nc", label: "Facturation", unread: 0 }];
const now = new Date().toISOString();
const threads = [
  { id: "33333333-3333-4333-8333-333333333333", mailboxId: boxes[0].id, subject: "Question de démonstration", lastMessageAt: now, unread: true, archived: false, spam: false, labels: [], triageStatus: "A_TRIER", triage: { mailboxId: null, confiance: 0.4, spam: false, labels: [] }, from: { address: "visiteur@exemple.nc", name: "Visiteur" }, snippet: "Bonjour, ceci est un essai.", messageCount: 1, attachmentCount: 1, firstAttachmentName: "image.png", hasOutbound: false, hasInbound: true },
  { id: "44444444-4444-4444-8444-444444444444", mailboxId: boxes[0].id, subject: "Message sans extensions", lastMessageAt: now, unread: false, archived: false, spam: false, labels: [], triageStatus: "RANGE", triage: null },
  { id: "55555555-5555-4555-8555-555555555555", mailboxId: boxes[1].id, subject: "Facture fictive", lastMessageAt: now, unread: false, archived: false, spam: false, labels: [], triageStatus: "RANGE", triage: null },
];
const messageEntrant = (thread, mailbox, identite) => ({ id: crypto.randomUUID(), direction: "IN", fromAddress: `${identite}@exemple.nc`, fromName: "Expéditeur fictif", toAddresses: [mailbox.address], ccAddresses: [], subject: thread.subject, sentAt: now, text: "Bonjour, essai local.", html: thread === threads[0] ? '<p>Image locale <img src="comms-pj:77777777-7777-4777-8777-777777777777"> et distante <img src="https://exemple.nc/image.png"></p>' : "<p>Message fictif de démonstration.</p>", attachments: thread === threads[0] ? [{ id: "77777777-7777-4777-8777-777777777777", filename: "image.png", contentType: "image/png", size: 68, inline: true, disponible: true }] : [] });
const messagesByThread = new Map(threads.map((thread, i) => [thread.id, [messageEntrant(thread, boxes[thread.mailboxId === boxes[0].id ? 0 : 1], ["visiteur", "contact", "facturation"][i])]]));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=", "base64");
const uuid = () => crypto.randomUUID();
async function body(req) { let s = ""; for await (const c of req) s += c; try { return JSON.parse(s); } catch { return {}; } }
const server = createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const send = (status, value) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(value === null ? "" : JSON.stringify(value)); };
  if (req.headers["x-core-key"] !== key || !String(req.headers.authorization ?? "").startsWith("Bearer ")) return send(401, { error: "non_autorise" });
  if (req.method === "GET" && u.pathname === "/api/mail/mailboxes") return send(200, { mailboxes: boxes.map(b => ({ ...b, unread: threads.filter(t => t.mailboxId === b.id && t.unread && !t.archived && !t.spam).length })) });
  if (req.method === "GET" && u.pathname === "/api/mail/threads") {
    const folder = u.searchParams.get("folder") ?? "inbox", mailbox = u.searchParams.get("mailbox"), label = u.searchParams.get("label"), q = (u.searchParams.get("q") ?? "").toLowerCase();
    const rows = threads.filter(t => (!mailbox || t.mailboxId === mailbox) && (folder === "archived" ? t.archived : folder === "spam" ? t.spam : folder === "a-trier" ? t.triageStatus === "A_TRIER" : !t.archived && !t.spam) && (!label || t.labels.includes(label)) && (!q || t.subject.toLowerCase().includes(q)));
    return send(200, { threads: rows, cursor: null });
  }
  const attachment = /^\/api\/mail\/attachments\/([^/]+)$/.exec(u.pathname);
  if (req.method === "GET" && attachment) {
    if (decodeURIComponent(attachment[1]) !== "77777777-7777-4777-8777-777777777777") return send(404, { error: "introuvable" });
    res.writeHead(200, { "Content-Type": "image/png", "Content-Disposition": "attachment; filename*=UTF-8''image.png" }); return res.end(png);
  }
  const reply = /^\/api\/mail\/threads\/([^/]+)\/reply$/.exec(u.pathname);
  if (req.method === "POST" && reply) {
    const id = decodeURIComponent(reply[1]), thread = threads.find(t => t.id === id); if (!thread) return send(404, { error: "introuvable" });
    const b = await body(req), messages = messagesByThread.get(id) ?? []; messages.push({ id: uuid(), direction: "OUT", fromAddress: boxes.find(x => x.id === thread.mailboxId)?.address ?? boxes[0].address, fromName: "Contact", toAddresses: ["visiteur@exemple.nc"], ccAddresses: [], subject: thread.subject, sentAt: new Date().toISOString(), text: b.text ?? "", html: b.html ?? null, attachments: [] }); messagesByThread.set(id, messages); thread.messageCount = (thread.messageCount ?? 1) + 1; thread.hasOutbound = true;
    return send(201, { threadId: id, messageId: uuid(), status: "QUEUED" });
  }
  if (req.method === "POST" && u.pathname === "/api/mail/send") {
    const b = await body(req); if (JSON.stringify(b.to ?? []).includes("refus@exemple.nc")) return send(409, { error: "expediteur_non_autorise" });
    const id = uuid(), date = new Date().toISOString(), to = Array.isArray(b.to) ? b.to : [];
    threads.push({ id, mailboxId: b.mailboxId, subject: b.subject, lastMessageAt: date, unread: false, archived: false, spam: false, labels: [], triageStatus: "RANGE", triage: null, messageCount: 1, hasOutbound: true, hasInbound: false });
    messagesByThread.set(id, [{ id: uuid(), direction: "OUT", fromAddress: boxes.find(x => x.id === b.mailboxId)?.address ?? boxes[0].address, fromName: "Contact", toAddresses: to, ccAddresses: b.cc ?? [], subject: b.subject, sentAt: date, text: b.text ?? "", html: b.html ?? null, attachments: [] }]);
    return send(201, { threadId: id, messageId: uuid(), status: "QUEUED" });
  }
  const route = /^\/api\/mail\/threads\/([^/]+)$/.exec(u.pathname);
  if (route) {
    const id = decodeURIComponent(route[1]), t = threads.find(x => x.id === id); if (!t) return send(404, { error: "introuvable" });
    if (req.method === "PATCH") { const b = await body(req); if (b.mailboxId) t.mailboxId = b.mailboxId; if (b.labels) t.labels = b.labels; if (b.read !== undefined) t.unread = !b.read; if (b.archived !== undefined) t.archived = b.archived; if (b.spam !== undefined) t.spam = b.spam; return send(200, { ok: true }); }
    if (req.method === "DELETE") { threads.splice(threads.indexOf(t), 1); messagesByThread.delete(id); res.writeHead(204); return res.end(); }
    if (req.method === "GET") {
      t.unread = false;
      const images = u.searchParams.get("images") === "distantes";
      const original = messagesByThread.get(id) ?? [];
      const imagesDistantesBloquees = images ? 0 : original.reduce((count, m) => count + (typeof m.html === "string" ? [...m.html.matchAll(/<img\b[^>]*src=["']https?:[^>]*>/gi)].length : 0), 0);
      const messages = original.map(m => ({ ...m, html: images ? m.html : typeof m.html === "string" ? m.html.replace(/<img\b[^>]*src=["']https?:[^>]*>/gi, "") : m.html }));
      return send(200, { ...t, unread: false, messages, imagesDistantesBloquees });
    }
  }
  return send(404, { error: "introuvable" });
});
server.listen(port, "127.0.0.1", () => console.log(`Faux core_comms en écoute sur 127.0.0.1:${port}`));
