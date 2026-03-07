/**
 * Script per ottenere il refresh token di Google Drive OAuth2.
 *
 * Prima di eseguire, assicurati di avere GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET
 * nel tuo .env.local, poi esegui:
 *
 *   node --env-file=.env.local scripts/setup-google-drive.mjs
 */

import http from "http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3333/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET devono essere nel .env.local");
  console.error("   Esegui: node --env-file=.env.local scripts/setup-google-drive.mjs");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\n🔗 Apri questo link nel browser per autorizzare:\n");
console.log(authUrl);
console.log("\n⏳ In attesa dell'autorizzazione...\n");

// Apri automaticamente il browser
import("child_process").then(({ exec }) => {
  exec(`open "${authUrl}"`);
});

// Server locale per ricevere il callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) return;

  const url = new URL(req.url, "http://localhost:3333");
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end("<h1>Errore: nessun codice ricevuto</h1>");
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>✅ Autorizzazione completata!</h1><p>Puoi chiudere questa finestra.</p>");

    console.log("✅ Autorizzazione completata!\n");
    console.log("📋 Aggiungi questa riga al tuo .env.local:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(`<h1>Errore</h1><pre>${err.message}</pre>`);
    console.error("Errore:", err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log("Server in ascolto su http://localhost:3333");
});
