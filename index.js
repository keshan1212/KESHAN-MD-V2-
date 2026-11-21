
const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

let sock;

app.get("/", (req, res) => {
  res.send("KESHAN-MD V2 is running!");
});

app.get("/pair", async (req, res) => {
  const number = (req.query.number || "").replace(/\D/g, "");

  if (!number) {
    return res.status(400).send(
      "Phone number required. Example: /pair?number=947XXXXXXXX"
    );
  }

  if (!sock) {
    return res.status(503).send("Bot is starting. Try again shortly.");
  }

  try {
    const code = await sock.requestPairingCode(number);
    res.send("KESHAN-MD V2 Pairing Code: " + code);
  } catch (err) {
    console.error(err);
    res.status(500).send("Pairing failed. Please try again.");
  }
});

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./session");

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["KESHAN-MD V2", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("KESHAN-MD V2 Connected!");
    }

    if (connection === "close") {
      sock = null;

      const status =
        lastDisconnect?.error?.output?.statusCode;

      if (status !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      if (!from || from.endsWith("@g.us")) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const command = text.trim().toLowerCase();

      if (command === ".ping") {
        await sock.sendMessage(from, {
          text: "🏓 PONG! KESHAN-MD V2 is Online."
        });
      }

      if (command === ".menu" || command === ".help") {
        await sock.sendMessage(from, {
          text:
`╭━━━〔 KESHAN-MD V2 〕━━━╮
┃ .menu
┃ .ping
┃ .jid
┃ .sticker
┃ .song
┃ .autoreply
┃ .antidelete
┃ .groupinfo
┃ .help
┃ .csong
┃ .tt
┃ .yt
┃ .fb
┃ .vv
┃ .st
┃ .pair
┃ .follow
┃ .react
╰━━━━━━━━━━━━━━━━━━╯`
        });
      }

      if (command === ".jid") {
        await sock.sendMessage(from, {
          text: "Chat ID: " + from
        });
      }
    }
  });
}

startBot().catch(console.error);

app.listen(PORT, () => {
  console.log("KESHAN-MD V2 server running on " + PORT);
});
