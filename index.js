const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const { categories } = require("./Commands300");

const app = express();
app.use(express.json({ limit: "10mb" }));

// ==================================================
// MP~01 BOT CONFIG
// ==================================================

const PORT = Number(process.env.PORT || 8080);

const PREFIX = process.env.BOT_PREFIX || ".";

const OWNER_NUMBER = String(
  process.env.OWNER_NUMBER || "2349065334401"
).replace(/\D/g, "");

const OWNER_NAME = process.env.OWNER_NAME || "MP~01";

const EVOLUTION_API_URL = String(
  process.env.EVOLUTION_API_URL || ""
).replace(/\/+$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || "";

const EVOLUTION_INSTANCE =
  process.env.EVOLUTION_INSTANCE || "";

const BOT_NUMBER = String(
  process.env.BOT_NUMBER || ""
).replace(/\D/g, "");

const LOGO_URL =
  process.env.LOGO_URL ||
  process.env.MP01_LOGO_URL ||
  "";

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET || "";

const ANTILINK_ENABLED =
  String(process.env.ANTILINK_ENABLED || "true").toLowerCase() === "true";

const ANTIDELETE_ENABLED =
  String(process.env.ANTIDELETE_ENABLED || "true").toLowerCase() === "true";

const ANTILINK_WARN =
  String(process.env.ANTILINK_WARN || "true").toLowerCase() === "true";

const START_TIME = Date.now();

// ==================================================
// MEMORY CACHE
// ==================================================

const messageCache = new Map();
const processedMessages = new Map();

const MAX_CACHE = 2000;
const CACHE_TTL = 30 * 60 * 1000;
const EVENT_TTL = 10 * 60 * 1000;

// ==================================================
// HELPERS
// ==================================================

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function cleanNumber(number) {
  return String(number || "")
    .replace("@s.whatsapp.net", "")
    .replace("@g.us", "")
    .replace(/\D/g, "");
}

function isOwner(number) {
  return cleanNumber(number) === OWNER_NUMBER;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function isGroup(jid) {
  return String(jid || "").endsWith("@g.us");
}

function messageId(data) {
  return (
    data?.key?.id ||
    data?.id ||
    data?.messageId ||
    null
  );
}

function remoteJid(data) {
  return (
    data?.key?.remoteJid ||
    data?.remoteJid ||
    data?.chatId ||
    null
  );
}

function senderJid(data) {
  return (
    data?.key?.participant ||
    data?.participant ||
    data?.sender ||
    remoteJid(data) ||
    ""
  );
}

function messageText(data) {
  return (
    data?.message?.conversation ||
    data?.message?.extendedTextMessage?.text ||
    data?.data?.message?.conversation ||
    data?.data?.message?.extendedTextMessage?.text ||
    data?.text ||
    ""
  );
}

function containsLink(text) {
  return /(?:https?:\/\/|www\.)\S+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ng|me|xyz|info|biz|app|dev|ly|gg)(?:\/\S*)?/i.test(
    String(text || "")
  );
}

function evolutionHeaders() {
  return {
    apikey: EVOLUTION_API_KEY,
    "Content-Type": "application/json"
  };
}

function checkEvolutionConfig() {
  if (
    !EVOLUTION_API_URL ||
    !EVOLUTION_API_KEY ||
    !EVOLUTION_INSTANCE
  ) {
    throw new Error(
      "Evolution API configuration is incomplete."
    );
  }
}

// ==================================================
// EVOLUTION API
// ==================================================

async function sendText(number, text) {
  checkEvolutionConfig();

  const url =
    `${EVOLUTION_API_URL}/message/sendText/` +
    encodeURIComponent(EVOLUTION_INSTANCE);

  try {
    const response = await axios.post(
      url,
      {
        number,
        text
      },
      {
        headers: evolutionHeaders(),
        timeout: 15000
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "❌ SEND TEXT ERROR:",
      error.response?.data || error.message
    );

    throw error;
  }
}

async function sendImage(number, imageUrl, caption) {
  if (!imageUrl) return;

  checkEvolutionConfig();

  const url =
    `${EVOLUTION_API_URL}/message/sendMedia/` +
    encodeURIComponent(EVOLUTION_INSTANCE);

  try {
    const response = await axios.post(
      url,
      {
        number,
        mediatype: "image",
        mimetype: "image/jpeg",
        caption,
        media: imageUrl,
        fileName: "MP01-logo.jpg"
      },
      {
        headers: evolutionHeaders(),
        timeout: 20000
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "❌ SEND IMAGE ERROR:",
      error.response?.data || error.message
    );
  }
}

async function deleteForEveryone(
  jid,
  id,
  fromMe = false
) {
  checkEvolutionConfig();

  const url =
    `${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/` +
    encodeURIComponent(EVOLUTION_INSTANCE);

  return axios.delete(url, {
    headers: evolutionHeaders(),
    data: {
      id,
      remoteJid: jid,
      fromMe: Boolean(fromMe)
    },
    timeout: 15000
  });
}

// ==================================================
// MESSAGE CACHE
// ==================================================

function rememberMessage(data) {
  const id = messageId(data);
  const jid = remoteJid(data);

  if (!id || !jid) return;

  messageCache.set(id, {
    jid,
    sender: senderJid(data),
    text: messageText(data),
    timestamp: Date.now()
  });

  while (messageCache.size > MAX_CACHE) {
    const oldest = messageCache.keys().next().value;

    if (oldest) {
      messageCache.delete(oldest);
    }
  }
}

function pruneCaches() {
  const now = Date.now();

  for (const [key, value] of messageCache) {
    if (now - value.timestamp > CACHE_TTL) {
      messageCache.delete(key);
    }
  }

  for (const [key, timestamp] of processedMessages) {
    if (now - timestamp > EVENT_TTL) {
      processedMessages.delete(key);
    }
  }
}

setInterval(pruneCaches, 60 * 1000).unref();

// ==================================================
// MENU
// ==================================================

function buildMenu() {
  const commandCount = Object.values(categories).reduce(
    (total, list) => total + list.length,
    0
  );

  let text = `
╭━━━〔 👑 MP~01 BOT 〕━━━╮
┃
┃ 🤖 Bot      : MP~01 BOT
┃ 👑 Owner    : ${OWNER_NAME}
┃ ⚡ Prefix   : ${PREFIX}
┃ 📚 Commands : ${commandCount}
┃ 🔗 Anti-link: ${ANTILINK_ENABLED ? "ON" : "OFF"}
┃ 🗑️ Anti-delete: ${ANTIDELETE_ENABLED ? "ON" : "OFF"}
┃ 🟢 Status   : Online
┃
╰━━━━━━━━━━━━━━━━━━━━╯

`;

  for (const [category, list] of Object.entries(categories)) {
    text += `╭━━〔 ${category} 〕━━╮\n`;

    for (const command of list) {
      text += `┃ ${PREFIX}${command}\n`;
    }

    text += "╰━━━━━━━━━━━━━━━━━━╯\n\n";
  }

  text += `
╭━━〔 🔗 CONNECT 〕━━╮
┃ 👑 Owner
┃ https://wa.me/${OWNER_NUMBER}
`;

  if (BOT_NUMBER) {
    text += `┃ 🤖 Bot
┃ https://wa.me/${BOT_NUMBER}
`;
  }

  text += `╰━━━━━━━━━━━━━━━━━━╯

💡 Type ${PREFIX}help for commands.
`;

  return text;
}

// ==================================================
// ANTI-LINK
// ==================================================

async function handleAntiLink(data) {
  if (!ANTILINK_ENABLED) return false;

  const jid = remoteJid(data);
  const id = messageId(data);
  const sender = senderJid(data);
  const text = messageText(data);

  if (
    !isGroup(jid) ||
    !id ||
    !text ||
    data?.key?.fromMe ||
    isOwner(sender) ||
    !containsLink(text)
  ) {
    return false;
  }

  try {
    await deleteForEveryone(jid, id, false);

    console.log(
      "🔗 Anti-link deleted:",
      id,
      "from:",
      sender,
      "group:",
      jid
    );
  } catch (error) {
    console.error(
      "❌ Anti-link deletion failed:",
      error.response?.data || error.message
    );
  }

  if (ANTILINK_WARN) {
    try {
      await sendText(
        jid,
        `🚫 LINK DETECTED

Links are not allowed in this group.

👤 Sender: ${cleanNumber(sender)}
🛡️ MP~01 Anti-Link`
      );
    } catch (error) {
      console.error(
        "❌ Anti-link warning failed:",
        error.response?.data || error.message
      );
    }
  }

  return true;
}

// ==================================================
// ANTI-DELETE
// ==================================================

async function handleAntiDelete(data) {
  if (!ANTIDELETE_ENABLED) return;

  const id = messageId(data);
  const jid = remoteJid(data);

  if (!id || !isGroup(jid)) return;

  const cached = messageCache.get(id);

  if (!cached) {
    console.log(
      "⚠️ Deleted message not found in cache:",
      id
    );

    return;
  }

  messageCache.delete(id);

  if (!cached.text) return;

  try {
    await sendText(
      jid,
      `🗑️ DELETED MESSAGE

👤 Sender: ${cleanNumber(cached.sender)}

💬 Message:
${cached.text}

🛡️ MP~01 Anti-Delete`
    );

    console.log(
      "🗑️ Deleted message recovered:",
      id
    );
  } catch (error) {
    console.error(
      "❌ Anti-delete recovery failed:",
      error.response?.data || error.message
    );
  }
}

// ==================================================
// WEBHOOK SECURITY
// ==================================================

function webhookAuthorized(req) {
  if (!WEBHOOK_SECRET) {
    return true;
  }

  const supplied =
    req.get("x-webhook-secret") ||
    req.get("x-evolution-secret") ||
    req.query.secret ||
    "";

  return String(supplied) === String(WEBHOOK_SECRET);
}

// ==================================================
// COMMAND HANDLER
// ==================================================

async function handleCommand(
  number,
  command,
  args,
  rawText,
  messageData
) {
  const argText = args.join(" ");

  // ==================================================
  // GENERAL
  // ==================================================

  if (
    command === "menu" ||
    command === "help" ||
    command === "commands" ||
    command === "menu2"
  ) {
    if (LOGO_URL) {
      await sendImage(
        number,
        LOGO_URL,
        "👑 MP~01 BOT\n\nWelcome to MP~01 BOT!"
      );
    }

    await sendText(number, buildMenu());
    return;
  }

  if (command === "ping") {
    await sendText(
      number,
      `🏓 PONG!

⚡ MP~01 BOT is responding.
🟢 Online`
    );

    return;
  }

  if (command === "alive") {
    await sendText(
      number,
      `╭━━〔 👑 MP~01 BOT 〕━━╮
┃ 🟢 ONLINE
┃ ⚡ Running normally
┃ 👑 ${OWNER_NAME}
╰━━━━━━━━━━━━━━━━━━╯`
    );

    return;
  }

  if (
    command === "bot" ||
    command === "info" ||
    command === "knox"
  ) {
    await sendText(
      number,
      `╭━━〔 👑 MP~01 BOT 〕━━╮
┃
┃ 🤖 Name: MP~01 BOT
┃ 👑 Owner: ${OWNER_NAME}
┃ ⚡ Prefix: ${PREFIX}
┃ 📚 Commands: ${Object.values(categories).flat().length}
┃ 🔗 Anti-link: ${ANTILINK_ENABLED ? "ON" : "OFF"}
┃ 🗑️ Anti-delete: ${ANTIDELETE_ENABLED ? "ON" : "OFF"}
┃ 🟢 Status: Online
┃
╰━━━━━━━━━━━━━━━━━━╯`
    );

    return;
  }

  if (command === "owner") {
    await sendText(
      number,
      `👑 MP~01 BOT OWNER

Name: ${OWNER_NAME}

WhatsApp:
https://wa.me/${OWNER_NUMBER}`
    );

    return;
  }

  if (command === "uptime") {
    await sendText(
      number,
      `⏱️ MP~01 BOT UPTIME

${formatUptime(Date.now() - START_TIME)}`
    );

    return;
  }

  if (command === "status") {
    await sendText(
      number,
      `📊 MP~01 BOT STATUS

🟢 Bot: Online
⚡ Prefix: ${PREFIX}
🔗 Anti-link: ${ANTILINK_ENABLED ? "ON" : "OFF"}
🗑️ Anti-delete: ${ANTIDELETE_ENABLED ? "ON" : "OFF"}
⏱️ Uptime: ${formatUptime(Date.now() - START_TIME)}`
    );

    return;
  }

  // ==================================================
  // FUN
  // ==================================================

  if (command === "joke") {
    await sendText(
      number,
      randomItem([
        "😂 Why did the phone go to school? To improve its connection!",
        "🤣 I told my bot to take a break. It said ERROR 404!",
        "😂 My Wi-Fi and I have a complicated relationship."
      ])
    );

    return;
  }

  if (command === "quote") {
    await sendText(
      number,
      randomItem([
        "💭 Keep learning. Keep building. Keep improving.",
        "💭 Small progress is still progress.",
        "💭 Build something today that future-you will appreciate."
      ])
    );

    return;
  }

  if (command === "fact") {
    await sendText(
      number,
      randomItem([
        "🧠 Honey can remain stable for a very long time when properly stored.",
        "🌍 Earth rotates approximately once every 24 hours.",
        "⚡ Lightning can heat surrounding air extremely quickly."
      ])
    );

    return;
  }

  if (command === "truth") {
    await sendText(
      number,
      "🎯 TRUTH: What is one goal you really want to accomplish?"
    );

    return;
  }

  if (command === "dare") {
    await sendText(
      number,
      "🔥 DARE: Send your funniest emoji combination to a friend."
    );

    return;
  }

  if (command === "roast") {
    await sendText(
      number,
      "🔥 Roast: Your phone has more confidence than battery percentage. 😂"
    );

    return;
  }

  if (command === "ship") {
    if (args.length < 2) {
      await sendText(
        number,
        `Usage: ${PREFIX}ship name1 name2`
      );

      return;
    }

    const score =
      Math.floor(Math.random() * 101);

    await sendText(
      number,
      `💞 ${args[0]} + ${args[1]}

Compatibility: ${score}%`
    );

    return;
  }

  if (command === "love") {
    await sendText(
      number,
      "❤️ Spread kindness, respect and good energy."
    );

    return;
  }

  if (command === "laugh") {
    await sendText(number, "😂😂😂 HAHAHA!");
    return;
  }

  if (command === "compliment") {
    await sendText(
      number,
      "✨ You're doing better than you think. Keep going!"
    );

    return;
  }

  // ==================================================
  // GAMES
  // ==================================================

  if (
    command === "dice" ||
    command === "roll"
  ) {
    await sendText(
      number,
      `🎲 You rolled: ${
        Math.floor(Math.random() * 6) + 1
      }`
    );

    return;
  }

  if (command === "coin") {
    await sendText(
      number,
      `🪙 ${
        Math.random() < 0.5
          ? "HEADS"
          : "TAILS"
      }`
    );

    return;
  }

  if (command === "rps") {
    const choices = [
      "rock",
      "paper",
      "scissors"
    ];

    const botChoice = randomItem(choices);

    await sendText(
      number,
      `✊ ROCK / ✋ PAPER / ✌️ SCISSORS

Bot chose: ${botChoice}

Use:
${PREFIX}rps rock
${PREFIX}rps paper
${PREFIX}rps scissors`
    );

    return;
  }

  if (
    command === "number" ||
    command === "guess"
  ) {
    await sendText(
      number,
      `🎯 Guess a number from 1-10.

Challenge number:
${
  Math.floor(Math.random() * 10) + 1
}`
    );

    return;
  }

  if (command === "8ball") {
    await sendText(
      number,
      randomItem([
        "🎱 Yes.",
        "🎱 No.",
        "🎱 Maybe.",
        "🎱 Definitely.",
        "🎱 Ask again later."
      ])
    );

    return;
  }

  if (command === "slot") {
    const symbols = [
      "🍒",
      "🍋",
      "⭐",
      "💎",
      "7️⃣"
    ];

    const result = [
      randomItem(symbols),
      randomItem(symbols),
      randomItem(symbols)
    ];

    const jackpot =
      result[0] === result[1] &&
      result[1] === result[2];

    await sendText(
      number,
      `🎰 ${result.join(" | ")}

${jackpot ? "🎉 JACKPOT!" : "Try again!"}`
    );

    return;
  }

  if (command === "math") {
    const a =
      Math.floor(Math.random() * 20) + 1;

    const b =
      Math.floor(Math.random() * 20) + 1;

    await sendText(
      number,
      `🧮 QUICK MATH

${a} + ${b} = ?`
    );

    return;
  }

  if (command === "random") {
    await sendText(
      number,
      `🎲 Random number: ${
        Math.floor(Math.random() * 1000) + 1
      }`
    );

    return;
  }

  // ==================================================
  // UTILITY
  // ==================================================

  if (command === "time") {
    await sendText(
      number,
      `🕐 Current server time:
${new Date().toLocaleTimeString()}`
    );

    return;
  }

  if (command === "date") {
    await sendText(
      number,
      `📅 Date:
${new Date().toLocaleDateString()}`
    );

    return;
  }

  if (command === "calc") {
    if (
      !argText ||
      !/^[0-9+\-*/().%\s]+$/.test(argText)
    ) {
      await sendText(
        number,
        `Usage: ${PREFIX}calc 10 + 5`
      );

      return;
    }

    try {
      const result = Function(
        `"use strict"; return (${argText})`
      )();

      await sendText(
        number,
        `🧮 ${argText} = ${result}`
      );
    } catch {
      await sendText(
        number,
        "❌ Invalid calculation."
      );
    }

    return;
  }

  if (command === "count") {
    await sendText(
      number,
      `🔢 Words counted: ${args.length}`
    );

    return;
  }

  if (command === "reverse") {
    await sendText(
      number,
      argText
        ? [...argText].reverse().join("")
        : `Usage: ${PREFIX}reverse text`
    );

    return;
  }

  if (command === "upper") {
    await sendText(
      number,
      argText
        ? argText.toUpperCase()
        : `Usage: ${PREFIX}upper text`
    );

    return;
  }

  if (command === "lower") {
    await sendText(
      number,
      argText
        ? argText.toLowerCase()
        : `Usage: ${PREFIX}lower text`
    );

    return;
  }

  if (command === "length") {
    await sendText(
      number,
      `📏 Length: ${argText.length}`
    );

    return;
  }

  if (command === "echo") {
    await sendText(
      number,
      argText || "🔊 Echo!"
    );

    return;
  }

  if (command === "choose") {
    if (args.length < 2) {
      await sendText(
        number,
        `Usage: ${PREFIX}choose pizza rice`
      );

      return;
    }

    await sendText(
      number,
      `🎯 I choose: ${randomItem(args)}`
    );

    return;
  }

  // ==================================================
  // GROUP
  // ==================================================

  if (command === "groupinfo") {
    await sendText(
      number,
      `👥 GROUP INFO

Group ID:
${remoteJid(messageData) || "Unknown"}`
    );

    return;
  }

  if (command === "members") {
    await sendText(
      number,
      "👥 Member information requires the Evolution API group metadata endpoint."
    );

    return;
  }

  if (command === "admins") {
    await sendText(
      number,
      "👑 Admin information requires the Evolution API group metadata endpoint."
    );

    return;
  }

  if (command === "tagall") {
    await sendText(
      number,
      `📢 TAG ALL

${argText || "Everyone, MP~01 BOT has a message for you!"}`
    );

    return;
  }

  if (command === "hidetag") {
    await sendText(
      number,
      argText || "📢 MP~01 BOT announcement"
    );

    return;
  }

  if (command === "groupid") {
    await sendText(
      number,
      `🆔 Group/Chat ID:
${remoteJid(messageData) || "Unknown"}`
    );

    return;
  }

  if (command === "rules") {
    await sendText(
      number,
      `📜 MP~01 GROUP RULES

1. Respect everyone.
2. No spam.
3. No scams.
4. Follow group admin rules.
5. Keep the chat useful.`
    );

    return;
  }

  if (command === "welcome") {
    await sendText(
      number,
      "👋 Welcome to the group! Powered by 👑 MP~01 BOT."
    );

    return;
  }

  if (command === "goodbye") {
    await sendText(
      number,
      "👋 Goodbye! Take care."
    );

    return;
  }

  // ==================================================
  // MEDIA
  // ==================================================

  if (command === "sticker") {
    await sendText(
      number,
      "🖼️ Reply to an image with .sticker to enable sticker processing."
    );

    return;
  }

  if (
    [
      "image",
      "audio",
      "video",
      "play",
      "song",
      "yt",
      "download",
      "media",
      "qr"
    ].includes(command)
  ) {
    await sendText(
      number,
      `🎬 ${command.toUpperCase()}

This command is registered and ready for media-provider integration.`
    );

    return;
  }

  // ==================================================
  // TOOLS
  // ==================================================

  if (command === "uuid") {
    await sendText(
      number,
      `🆔 ${crypto.randomUUID()}`
    );

    return;
  }

  if (command === "password") {
    const password =
      crypto.randomBytes(12).toString("base64url");

    await sendText(
      number,
      `🔐 Generated password:
${password}`
    );

    return;
  }

  if (command === "base64") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}base64 hello`
      );

      return;
    }

    await sendText(
      number,
      Buffer.from(argText).toString("base64")
    );

    return;
  }

  if (command === "unbase64") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}unbase64 SGVsbG8=`
      );

      return;
    }

    await sendText(
      number,
      Buffer.from(
        argText,
        "base64"
      ).toString("utf8")
    );

    return;
  }

  if (command === "json") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}json {"name":"MP~01"}`
      );

      return;
    }

    try {
      const parsed = JSON.parse(argText);

      await sendText(
        number,
        JSON.stringify(parsed, null, 2)
      );
    } catch {
      await sendText(
        number,
        "❌ Invalid JSON."
      );
    }

    return;
  }

  if (command === "binary") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}binary hello`
      );

      return;
    }

    const result =
      [...Buffer.from(argText)]
        .map(byte =>
          byte.toString(2).padStart(8, "0")
        )
        .join(" ");

    await sendText(number, result);

    return;
  }

  if (command === "unbinary") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}unbinary 01001000 01101001`
      );

      return;
    }

    try {
      const result =
        argText
          .split(/\s+/)
          .map(binary => parseInt(binary, 2))
          .map(code => String.fromCharCode(code))
          .join("");

      await sendText(number, result);
    } catch {
      await sendText(
        number,
        "❌ Invalid binary."
      );
    }

    return;
  }

  if (command === "hex") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}hex hello`
      );

      return;
    }

    await sendText(
      number,
      Buffer.from(argText).toString("hex")
    );

    return;
  }

  if (command === "unhex") {
    if (!argText) {
      await sendText(
        number,
        `Usage: ${PREFIX}unhex 68656c6c6f`
      );

      return;
    }

    try {
      await sendText(
        number,
        Buffer.from(
          argText,
          "hex"
        ).toString("utf8")
      );
    } catch {
      await sendText(
        number,
        "❌ Invalid hexadecimal."
      );
    }

    return;
  }

  if (command === "timestamp") {
    await sendText(
      number,
      `⏱️ Unix timestamp:
${Math.floor(Date.now() / 1000)}`
    );

    return;
  }

  // ==================================================
  // OWNER
  // ==================================================

  const ownerCommands = [
    "broadcast",
    "restart",
    "setprefix",
    "botnumber",
    "config",
    "ownerinfo",
    "private",
    "public",
    "maintenance",
    "shutdown"
  ];

  if (ownerCommands.includes(command)) {
    if (!isOwner(number)) {
      await sendText(
        number,
        "❌ This is an owner-only command."
      );

      return;
    }

    if (command === "ownerinfo") {
      await sendText(
        number,
        `👑 OWNER PANEL

Name: ${OWNER_NAME}
Number: ${OWNER_NUMBER}
Bot: MP~01 BOT`
      );

      return;
    }

    if (command === "botnumber") {
      await sendText(
        number,
        BOT_NUMBER
          ? `🤖 Bot Number:
${BOT_NUMBER}`
          : "BOT_NUMBER is not configured."
      );

      return;
    }

    if (command === "config") {
      await sendText(
        number,
        `⚙️ CONFIG

Prefix: ${PREFIX}
Bot Number: ${BOT_NUMBER || "Not set"}
Anti-link: ${ANTILINK_ENABLED ? "ON" : "OFF"}
Anti-delete: ${ANTIDELETE_ENABLED ? "ON" : "OFF"}
Instance: ${EVOLUTION_INSTANCE}`
      );

      return;
    }

    if (command === "setprefix") {
      await sendText(
        number,
        "⚙️ Update BOT_PREFIX in Railway Variables and redeploy."
      );

      return;
    }

    if (command === "broadcast") {
      await sendText(
        number,
        "📢 Broadcast requires a configured recipient list."
      );

      return;
    }

    if (command === "restart") {
      await sendText(
        number,
        "♻️ Restart requested. Railway will manage the process."
      );

      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return;
    }

    if (command === "private") {
      await sendText(
        number,
        "🔒 Private mode requested."
      );

      return;
    }

    if (command === "public") {
      await sendText(
        number,
        "🌍 Public mode requested."
      );

      return;
    }

    if (command === "maintenance") {
      await sendText(
        number,
        "🛠️ Maintenance mode requested."
      );

      return;
    }

    if (command === "shutdown") {
      await sendText(
        number,
        "⚠️ Shutdown requested. Bot will stop."
      );

      setTimeout(() => {
        process.exit(0);
      }, 1000);

      return;
    }
  }

  // ==================================================
  // SOCIAL / EXTRA
  // ==================================================

  if (command === "goodmorning") {
    await sendText(
      number,
      "🌅 Good morning! Have a great day from 👑 MP~01."
    );

    return;
  }

  if (command === "goodnight") {
    await sendText(
      number,
      "🌙 Good night! Rest well from 👑 MP~01 BOT."
    );

    return;
  }

  if (command === "thanks") {
    await sendText(
      number,
      "❤️ You're welcome!"
    );

    return;
  }

  if (command === "sorry") {
    await sendText(
      number,
      "🤝 Apology accepted. Let's keep moving forward."
    );

    return;
  }

  if (command === "motivate") {
    await sendText(
      number,
      "💪 Keep going. Consistency beats waiting for motivation."
    );

    return;
  }

  if (command === "advice") {
    await sendText(
      number,
      "💡 Learn, practice, build, test, repeat."
    );

    return;
  }

  if (command === "factcheck") {
    await sendText(
      number,
      "🔎 Send the claim you want checked."
    );

    return;
  }

  if (command === "statusmsg") {
    await sendText(
      number,
      "📢 Status message command received."
    );

    return;
  }

  if (command === "profile") {
    await sendText(
      number,
      "👤 Profile command received."
    );

    return;
  }

  if (command === "greeting") {
    await sendText(
      number,
      "👋 Hello from MP~01 BOT!"
    );

    return;
  }

  if (command === "report") {
    await sendText(
      number,
      "📝 Report received. Contact the owner for follow-up."
    );

    return;
  }

  if (command === "feedback") {
    await sendText(
      number,
      "💬 Feedback received."
    );

    return;
  }

  if (command === "donate") {
    await sendText(
      number,
      "❤️ Donation information can be configured by the owner."
    );

    return;
  }

  if (command === "support") {
    await sendText(
      number,
      "🛟 MP~01 BOT support."
    );

    return;
  }

  if (command === "connect") {
    await sendText(
      number,
      "🔗 MP~01 is connected through Evolution API."
    );

    return;
  }

  // ==================================================
  // UNKNOWN COMMAND
  // ==================================================

  await sendText(
    number,
    `❓ Unknown command: ${PREFIX}${command}

Type ${PREFIX}menu for the command list.`
  );
}

// ==================================================
// WEBHOOK PROCESSOR
// ==================================================

async function processWebhook(payload) {
  const event = String(
    payload?.event ||
    payload?.type ||
    ""
  ).toUpperCase();

  const data =
    payload?.data ||
    payload;

  // Deleted message event
  if (
    event.includes("MESSAGES_DELETE") ||
    event.includes("DELETE")
  ) {
    await handleAntiDelete(data);
    return;
  }

  const id = messageId(data);

  if (id && processedMessages.has(id)) {
    return;
  }

  if (id) {
    processedMessages.set(
      id,
      Date.now()
    );
  }

  // Cache messages before checking anti-link
  if (!data?.key?.fromMe) {
    rememberMessage(data);
  }

  // Anti-link
  if (await handleAntiLink(data)) {
    return;
  }

  // Ignore bot's own messages
  if (data?.key?.fromMe) {
    return;
  }

  const jid = remoteJid(data);
  const text = messageText(data).trim();

  if (
    !jid ||
    !text ||
    !text.startsWith(PREFIX)
  ) {
    return;
  }

  const parts =
    text
      .slice(PREFIX.length)
      .trim()
      .split(/\s+/);

  const command =
    String(parts.shift() || "")
      .toLowerCase();

  if (!command) return;

  try {
    await handleCommand(
      jid,
      command,
      parts,
      text,
      data
    );
  } catch (error) {
    console.error(
      "❌ COMMAND ERROR:",
      error.response?.data ||
      error.message
    );

    try {
      await sendText(
        jid,
        "❌ Command failed. Check the Railway logs."
      );
    } catch {}
  }
}

// ==================================================
// HTTP / RAILWAY
// ==================================================

app.get("/", (req, res) => {
  res.json({
    bot: "MP~01 BOT",
    status: "online",
    architecture:
      "WhatsApp -> Evolution API -> MP~01 -> Railway"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    bot: "MP~01 BOT",
    uptime: formatUptime(
      Date.now() - START_TIME
    ),
    antiLink: ANTILINK_ENABLED,
    antiDelete: ANTIDELETE_ENABLED
  });
});

// ==================================================
// MAIN WEBHOOK
// ==================================================

app.post("/webhook", async (req, res) => {
  if (!webhookAuthorized(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  res.status(200).json({
    received: true
  });

  try {
    await processWebhook(req.body);
  } catch (error) {
    console.error(
      "❌ WEBHOOK ERROR:",
      error.response?.data ||
      error.message
    );
  }
});

// ==================================================
// MESSAGE UPSERT WEBHOOK
// ==================================================

app.post(
  "/webhook/messages-upsert",
  async (req, res) => {
    if (!webhookAuthorized(req)) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    res.status(200).json({
      received: true
    });

    try {
      await processWebhook({
        event: "MESSAGES_UPSERT",
        data:
          req.body?.data ||
          req.body
      });
    } catch (error) {
      console.error(
        "❌ UPSERT ERROR:",
        error.response?.data ||
        error.message
      );
    }
  }
);

// ==================================================
// MESSAGE DELETE WEBHOOK
// ==================================================

app.post(
  "/webhook/messages-delete",
  async (req, res) => {
    if (!webhookAuthorized(req)) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    res.status(200).json({
      received: true
    });

    try {
      await processWebhook({
        event: "MESSAGES_DELETE",
        data:
          req.body?.data ||
          req.body
      });
    } catch (error) {
      console.error(
        "❌ DELETE EVENT ERROR:",
        error.response?.data ||
        error.message
      );
    }
  }
);

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
  console.log(
    `🚀 MP~01 BOT listening on port ${PORT}`
  );

  console.log(
    `🔗 Anti-link: ${
      ANTILINK_ENABLED
        ? "ON"
        : "OFF"
    }`
  );

  console.log(
    `🗑️ Anti-delete: ${
      ANTIDELETE_ENABLED
        ? "ON"
        : "OFF"
    }`
  );
});