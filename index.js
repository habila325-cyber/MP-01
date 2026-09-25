const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const { categories } = require("./Commands300");

const app = express();
app.use(express.json({ limit: "10mb" }));

// ==================================================
// KNOX BOT CONFIG
// ==================================================

const PORT = process.env.PORT || 8080;

const PREFIX = process.env.BOT_PREFIX || ".";

const OWNER_NUMBER = "2349065334401";
const OWNER_NAME = "MP~01";

const EVOLUTION_API_URL =
  process.env.EVOLUTION_API_URL;

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY;

const EVOLUTION_INSTANCE =
  process.env.EVOLUTION_INSTANCE;

const BOT_NUMBER =
  process.env.BOT_NUMBER || "";

const MP~01_LOGO_URL =
  process.env.KNOX_LOGO_URL || "";

const START_TIME = Date.now();

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
  return String(number)
    .replace("@s.whatsapp.net", "")
    .replace("@g.us", "");
}

function isOwner(number) {
  return cleanNumber(number) === OWNER_NUMBER;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ==================================================
// SEND TEXT
// ==================================================

async function sendText(number, text) {
  try {
    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;

    console.log("📤 Sending message to:", number);
    console.log("🌐 Evolution URL:", url);

    const response = await axios.post(
      url,
      {
        number: number,
        text: text
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log("✅ Message sent:", response.data);
    return response.data;

  } catch (error) {
    console.error(
      "❌ SEND TEXT ERROR:",
      error.response?.data || error.message
    );
  }
}

// ==================================================
// SEND IMAGE
// ==================================================

async function sendImage(number, imageUrl, caption) {
  if (!imageUrl) return;

  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`,
      {
        number,
        mediatype: "image",
        mimetype: "image/jpeg",
        caption,
        media: imageUrl,
        fileName: "MP~01-logo.jpg"
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );
  } catch (error) {
    console.error(
      "Image error:",
      error.response?.data || error.message
    );
  }
}

// ==================================================
// MENU
// ==================================================

function buildMenu() {
  let text = `
╭━━━〔 👑 KNOX BOT 〕━━━╮
┃
┃ 🤖 Bot      : MP~01 BOT
┃ 👑 Owner    : ${OWNER_NAME}
┃ ⚡ Prefix   : ${PREFIX}
┃ 📚 Commands : 100
┃ 🟢 Status   : Online
┃
╰━━━━━━━━━━━━━━━━━━━━╯

`;

  for (const [category, list] of Object.entries(categories)) {
    text += `╭━━〔 ${category} 〕━━╮\n`;

    for (const command of list) {
      text += `┃ ${PREFIX}${command}\n`;
    }

    text += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;
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
// COMMAND HANDLER
// ==================================================

async function handleCommand(number, command, args, rawText, messageData) {

  const argText = args.join(" ");

  // ---------------- GENERAL ----------------

  if (command === "menu" || command === "help" || command === "commands" || command === "menu2") {

    if (MP~01_LOGO_URL) {
      await sendImage(
        number,
        MP~01_LOGO_URL,
        "👑 KNOX MP~01 \n\nWelcome to MP~01 BOT!"
      );
    }

    await sendText(number, buildMenu());
    return;
  }

  if (command === "ping") {
    await sendText(
      number,
      `🏓 PONG!\n\n⚡ MP~01 BOT is responding.\n🟢 Online`
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

  if (command === "bot" || command === "info" || command === "knox") {
    await sendText(
      number,
      `╭━━〔 👑 MP~01 BOT 〕━━╮
┃
┃ 🤖 Name MP~01 Bot
┃ 👑 Owner: ${OWNER_NAME}
┃ 📱 Owner: ${OWNER_NUMBER}
┃ ⚡ Prefix: ${PREFIX}
┃ 📚 Commands: 100
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
📚 Commands: 100
⏱️ Uptime: ${formatUptime(Date.now() - START_TIME)}`
    );
    return;
  }

  // ---------------- FUN ----------------

  if (command === "joke") {
    const jokes = [
      "😂 Why did the phone go to school? To improve its connection!",
      "🤣 I told my bot to take a break. It said: ERROR 404!",
      "😂 My Wi-Fi and I have a complicated relationship."
    ];

    await sendText(number, randomItem(jokes));
    return;
  }

  if (command === "quote") {
    const quotes = [
      "💭 Keep learning. Keep building. Keep improving.",
      "💭 Small progress is still progress.",
      "💭 Build something today that future-you will appreciate."
    ];

    await sendText(number, randomItem(quotes));
    return;
  }

  if (command === "fact") {
    const facts = [
      "🧠 Honey never naturally spoils under normal storage conditions.",
      "🌍 Earth rotates once approximately every 24 hours.",
      "⚡ Lightning can heat the surrounding air extremely quickly."
    ];

    await sendText(number, randomItem(facts));
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
      await sendText(number, `Usage: ${PREFIX}ship name1 name2`);
      return;
    }

    const score = Math.floor(Math.random() * 101);

    await sendText(
      number,
      `💞 ${args[0]} + ${args[1]}\n\nCompatibility: ${score}%`
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

  // ---------------- GAMES ----------------

  if (command === "dice" || command === "roll") {
    const result = Math.floor(Math.random() * 6) + 1;

    await sendText(
      number,
      `🎲 You rolled: ${result}`
    );
    return;
  }

  if (command === "coin") {
    await sendText(
      number,
      `🪙 ${Math.random() < 0.5 ? "HEADS" : "TAILS"}`
    );
    return;
  }

  if (command === "rps") {
    const choices = ["rock", "paper", "scissors"];
    const bot = randomItem(choices);

    await sendText(
      number,
      `✊ ROCK / ✋ PAPER / ✌️ SCISSORS

Bot chose: ${bot}

Use:
${PREFIX}rps rock
${PREFIX}rps paper
${PREFIX}rps scissors`
    );
    return;
  }

  if (command === "number" || command === "guess") {
    const numberGuess = Math.floor(Math.random() * 10) + 1;

    await sendText(
      number,
      `🎯 Guess a number from 1-10.

Your random challenge number is:
${numberGuess}`
    );
    return;
  }

  if (command === "8ball") {
    const answers = [
      "🎱 Yes.",
      "🎱 No.",
      "🎱 Maybe.",
      "🎱 Definitely.",
      "🎱 Ask again later."
    ];

    await sendText(number, randomItem(answers));
    return;
  }

  if (command === "slot") {
    const symbols = ["🍒", "🍋", "⭐", "💎", "7️⃣"];

    const result = [
      randomItem(symbols),
      randomItem(symbols),
      randomItem(symbols)
    ];

    await sendText(
      number,
      `🎰 ${result.join(" | ")}

${result[0] === result[1] && result[1] === result[2]
  ? "🎉 JACKPOT!"
  : "Try again!"}`
    );
    return;
  }

  if (command === "math") {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;

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
      `🎲 Random number: ${Math.floor(Math.random() * 1000) + 1}`
    );
    return;
  }

  // ---------------- UTILITY ----------------

  if (command === "time") {
    await sendText(
      number,
      `🕐 Current server time:\n${new Date().toLocaleTimeString()}`
    );
    return;
  }

  if (command === "date") {
    await sendText(
      number,
      `📅 Date:\n${new Date().toLocaleDateString()}`
    );
    return;
  }

  if (command === "calc") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}calc 10 + 5`);
      return;
    }

    // Safe basic calculator
    if (!/^[0-9+\-*/().%\s]+$/.test(argText)) {
      await sendText(number, "❌ Only basic math is allowed.");
      return;
    }

    try {
      const result = Function(`"use strict"; return (${argText})`)();

      await sendText(
        number,
        `🧮 ${argText} = ${result}`
      );
    } catch {
      await sendText(number, "❌ Invalid calculation.");
    }

    return;
  }

  if (command === "count") {
    const count = args.length;

    await sendText(
      number,
      `🔢 Words counted: ${count}`
    );
    return;
  }

  if (command === "reverse") {
    await sendText(
      number,
      argText
        ? argText.split("").reverse().join("")
        : "Usage: .reverse your text"
    );
    return;
  }

  if (command === "upper") {
    await sendText(
      number,
      argText
        ? argText.toUpperCase()
        : "Usage: .upper your text"
    );
    return;
  }

  if (command === "lower") {
    await sendText(
      number,
      argText
        ? argText.toLowerCase()
        : "Usage: .lower YOUR TEXT"
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

  // ---------------- GROUP ----------------

  if (command === "groupinfo") {
    await sendText(
      number,
      `👥 GROUP INFO

Group ID:
${messageData?.key?.remoteJid || "Unknown"}`
    );
    return;
  }

  if (command === "members") {
    await sendText(
      number,
      "👥 Member information depends on the Evolution API group metadata response."
    );
    return;
  }

  if (command === "admins") {
    await sendText(
      number,
      "👑 Admin information depends on the Evolution API group metadata response."
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
      `🆔 Group/Chat ID:\n${messageData?.key?.remoteJid || "Unknown"}`
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
4. Follow the group admin's rules.
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

  // ---------------- MEDIA ----------------

  if (command === "sticker") {
    await sendText(
      number,
      "🖼️ Reply to an image with .sticker to enable sticker processing."
    );
    return;
  }

  if (
    command === "image" ||
    command === "audio" ||
    command === "video" ||
    command === "play" ||
    command === "song" ||
    command === "yt" ||
    command === "download" ||
    command === "media"
  ) {
    await sendText(
      number,
      `🎬 ${command.toUpperCase()}

This command is registered and ready for a media provider to be connected.`
    );
    return;
  }

  if (command === "qr") {
    await sendText(
      number,
      `🔳 QR command received.

Use a QR provider or QR library when you want QR generation enabled.`
    );
    return;
  }

  // ---------------- TOOLS ----------------

  if (command === "uuid") {
    await sendText(
      number,
      `🆔 ${crypto.randomUUID()}`
    );
    return;
  }

  if (command === "password") {
    const password = crypto
      .randomBytes(9)
      .toString("base64")
      .replace(/[+/=]/g, "X");

    await sendText(
      number,
      `🔐 Generated password:\n${password}`
    );
    return;
  }

  if (command === "base64") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}base64 hello`);
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
      await sendText(number, `Usage: ${PREFIX}unbase64 SGVsbG8=`);
      return;
    }

    try {
      await sendText(
        number,
        Buffer.from(argText, "base64").toString("utf8")
      );
    } catch {
      await sendText(number, "❌ Invalid Base64.");
    }

    return;
  }

  if (command === "json") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}json {"name":"Knox"}`);
      return;
    }

    try {
      const parsed = JSON.parse(argText);

      await sendText(
        number,
        JSON.stringify(parsed, null, 2)
      );
    } catch {
      await sendText(number, "❌ Invalid JSON.");
    }

    return;
  }

  if (command === "binary") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}binary hello`);
      return;
    }

    const result = [...Buffer.from(argText)]
      .map(byte => byte.toString(2).padStart(8, "0"))
      .join(" ");

    await sendText(number, result);
    return;
  }

  if (command === "unbinary") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}unbinary 01001000 01101001`);
      return;
    }

    try {
      const result = argText
        .split(/\s+/)
        .map(binary => parseInt(binary, 2))
        .map(code => String.fromCharCode(code))
        .join("");

      await sendText(number, result);
    } catch {
      await sendText(number, "❌ Invalid binary.");
    }

    return;
  }

  if (command === "hex") {
    if (!argText) {
      await sendText(number, `Usage: ${PREFIX}hex hello`);
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
      await sendText(number, `Usage: ${PREFIX}unhex 68656c6c6f`);
      return;
    }

    try {
      await sendText(
        number,
        Buffer.from(argText, "hex").toString("utf8")
      );
    } catch {
      await sendText(number, "❌ Invalid hexadecimal.");
    }

    return;
  }

  if (command === "timestamp") {
    await sendText(
      number,
      `⏱️ Unix timestamp:\n${Math.floor(Date.now() / 1000)}`
    );
    return;
  }

  // ---------------- OWNER ----------------

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
          ? `🤖 Bot Number:\n${BOT_NUMBER}`
          : "BOT_NUMBER is not configured."
      );
      return;
    }

    if (command === "config") {
      await sendText(
        number,
        `⚙️ CONFIG

Prefix: ${PREFIX}
Owner: ${OWNER_NUMBER}
Bot Number: ${BOT_NUMBER || "Not set"}
Commands: 100`
      );
      return;
    }

    if (command === "setprefix") {
      await sendText(
        number,
        "⚙️ Prefix changes require updating BOT_PREFIX in Railway Variables and redeploying."
      );
      return;
    }

    if (command === "broadcast") {
      await sendText(
        number,
        "📢 Broadcast system is available to the owner. A recipient list must be configured before broadcasting."
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
        "🛠️ Maintenance mode command received."
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

  // ---------------- SOCIAL ----------------

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
    await