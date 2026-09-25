// MP~01 BOT 
// 100 COMMANDS
// Owner: MP~01
// Owner Number: 2349065334401

const categories = {
  GENERAL: [
    "menu", "help", "ping", "alive", "bot",
    "info", "owner", "uptime", "status", "commands"
  ],

  FUN: [
    "joke", "quote", "fact", "truth", "dare",
    "roast", "ship", "love", "laugh", "compliment"
  ],

  GAMES: [
    "dice", "coin", "rps", "number", "guess",
    "8ball", "roll", "slot", "math", "random"
  ],

  UTILITY: [
    "time", "date", "calc", "count", "reverse",
    "upper", "lower", "length", "echo", "choose"
  ],

  GROUP: [
    "groupinfo", "members", "admins", "tagall", "hidetag",
    "groupid", "rules", "welcome", "goodbye", "groupname"
  ],

  MEDIA: [
    "sticker", "image", "audio", "video", "play",
    "song", "yt", "download", "media", "qr"
  ],

  TOOLS: [
    "uuid", "password", "base64", "unbase64", "json",
    "binary", "unbinary", "hex", "unhex", "timestamp"
  ],

  OWNER: [
    "broadcast", "restart", "setprefix", "botnumber", "config",
    "ownerinfo", "private", "public", "maintenance", "shutdown"
  ],

  SOCIAL: [
    "goodmorning", "goodnight", "thanks", "sorry", "motivate",
    "advice", "factcheck", "statusmsg", "profile", "greeting"
  ],

  EXTRA: [
    "menu2", "knox", "great", "version", "support",
    "report", "feedback", "donate", "link", "connect"
  ]
};

const commands = {};

for (const list of Object.values(categories)) {
  for (const command of list) {
    commands[command] = command;
  }
}

module.exports = {
  categories,
  commands
};