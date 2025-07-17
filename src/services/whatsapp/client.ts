/**
 * WhatsApp Service using Baileys
 * Handles connection, messaging, and media download
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  type WASocket,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
// @ts-ignore - no types available
import qrcode from "qrcode-terminal";

const AUTH_FOLDER = ".whatsapp-auth";

let sock: WASocket | null = null;

// Format timestamp for logs
function ts(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// Custom logger that formats Baileys messages nicely
const logger = {
  level: "info",
  info(obj: any, msg?: string) {
    const text = msg || obj?.msg || "";
    if (!text) return;
    // Filter and format important messages
    if (text.includes("connected to WA"))
      console.log(`   ${ts()} 🔗 Connected to WhatsApp servers`);
    else if (text.includes("logging in"))
      console.log(`   ${ts()} 🔑 Authenticating...`);
    else if (text.includes("opened connection"))
      console.log(`   ${ts()} 🌐 Connection established`);
    else if (text.includes("pre-keys found"))
      console.log(`   ${ts()} 🔐 Keys validated`);
    else if (text.includes("AwaitingInitialSync"))
      console.log(`   ${ts()} 📥 Syncing messages...`);
    else if (text.includes("History sync"))
      console.log(`   ${ts()} 📜 Syncing history...`);
    else if (text.includes("Own LID session"))
      console.log(`   ${ts()} ✅ Session ready`);
    else if (text.includes("resyncing"))
      return; // Skip noisy resync
    else if (text.includes("PreKey validation"))
      return; // Skip redundant
    else if (text.includes("offline messages"))
      return; // Skip
    else if (text.includes("injecting new app"))
      return; // Skip
    else if (text.includes("Current prekey"))
      return; // Skip
    // Show any unhandled important messages
    else console.log(`   ${ts()} 📋 ${text}`);
  },
  warn(obj: any, msg?: string) {
    const text = msg || obj?.msg || "";
    if (!text) return;
    if (text.includes("Timeout in AwaitingInitialSync"))
      console.log(`   ${ts()} ⏩ Sync complete (timeout, this is normal)`);
    else console.log(`   ${ts()} ⚠️  ${text}`);
  },
  error(obj: any, msg?: string) {
    const text = msg || obj?.msg || "";
    if (!text) return;
    // Skip known non-critical errors
    if (text.includes("failed to sync state")) return;
    console.log(`   ${ts()} ❌ ${text}`);
  },
  debug() {}, // Silent
  trace() {}, // Silent
  fatal(obj: any, msg?: string) {
    console.log(`   ${ts()} 💀 ${msg || obj?.msg || "Fatal error"}`);
  },
  child() {
    return logger;
  },
} as any;

/**
 * Connect to WhatsApp
 * Will show QR code on first connection
 */
export async function connectToWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR manually
    logger,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Scan this QR code to connect WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log("Connection closed. Reconnecting:", shouldReconnect);

      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log("\n✅ WhatsApp connected!");
    }
  });

  return sock;
}

// Store the target group JID for filtering
let targetGroupJid: string | null = null;

// Message callback type
type MessageCallback = (message: {
  from: string;
  sender: string;
  text: string;
  timestamp: Date;
  isGroup: boolean;
  hasImage?: boolean;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  mentionedJids?: string[];
}) => void;

let messageCallback: MessageCallback | null = null;

/**
 * Download image buffer from a message
 */
async function downloadImageBuffer(
  msg: WAMessage,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const imageMessage = msg.message?.imageMessage;
    if (!imageMessage) return null;

    const buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      {
        logger: undefined as any,
        reuploadRequest: sock!.updateMediaMessage,
      },
    );

    const mimeType = imageMessage.mimetype || "image/jpeg";

    return { buffer: buffer as Buffer, mimeType };
  } catch (error) {
    console.log(`   ${ts()} ⚠️  Failed to download image`);
    return null;
  }
}

// Format a JID to a short readable name
function shortJid(jid: string): string {
  if (jid.endsWith("@g.us")) return "group";
  return jid.split("@")[0] || jid;
}

/**
 * Start listening for messages from a specific group
 * @param groupJid - The group JID (e.g., "123456789@g.us")
 * @param callback - Function to call when a message is received
 */
export function listenToGroup(
  groupJid: string,
  callback: MessageCallback,
): void {
  if (!sock) {
    throw new Error("WhatsApp not connected");
  }

  targetGroupJid = groupJid;
  messageCallback = callback;

  sock.ev.on("messages.upsert", async (m) => {
    for (const msg of m.messages) {
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;

      // Extract message text (including image caption)
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";

      const hasImage = !!msg.message?.imageMessage;

      // Skip if no text AND no image
      if (!text && !hasImage) continue;

      // Get sender info
      const sender = msg.key.participant || msg.key.remoteJid || "unknown";
      const isGroup = remoteJid.endsWith("@g.us");
      const isTargetGroup = targetGroupJid && remoteJid === targetGroupJid;

      // Log ALL messages with clean format
      const from = shortJid(sender);
      const preview = text
        ? text.length > 50
          ? text.substring(0, 50) + "…"
          : text
        : "📷 imagen";
      const source = isTargetGroup ? "🏠" : isGroup ? "👥" : "👤";
      console.log(`   ${ts()} ${source} ${from}: ${preview}`);

      // Only process messages from target group
      if (!isTargetGroup) continue;

      // Download image if present
      let imageBuffer: Buffer | undefined;
      let imageMimeType: string | undefined;

      if (hasImage) {
        const result = await downloadImageBuffer(msg);
        if (result) {
          imageBuffer = result.buffer;
          imageMimeType = result.mimeType;
          console.log(
            `   ${ts()}    📷 Imagen descargada (${result.mimeType})`,
          );
        }
      }

      // Extract mentioned JIDs
      const mentionedJids =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      if (messageCallback) {
        messageCallback({
          from: remoteJid,
          sender,
          text,
          timestamp: new Date((msg.messageTimestamp as number) * 1000),
          isGroup,
          hasImage,
          imageBuffer,
          imageMimeType,
          mentionedJids: mentionedJids.length > 0 ? mentionedJids : undefined,
        });
      }
    }
  });

  console.log(`   ${ts()} 👂 Listening to group: ${groupJid}`);
}

/**
 * Wait for WhatsApp connection to be ready
 */
export function waitForConnection(sock: WASocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout (60s)"));
    }, 60000);

    sock.ev.on("connection.update", (update) => {
      if (update.connection === "open") {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
}

/**
 * Send a text message
 * @param jid - WhatsApp ID (phone@s.whatsapp.net or group@g.us)
 * @param text - Message text
 * @param mentions - Optional array of JIDs to mention (e.g., ["51933844567@lid"])
 */
export async function sendMessage(
  jid: string,
  text: string,
  mentions?: string[],
): Promise<void> {
  if (!sock) {
    throw new Error("WhatsApp not connected");
  }

  await sock.sendMessage(jid, { text, mentions });
  const preview = text.length > 40 ? text.substring(0, 40) + "…" : text;
  console.log(`   ${ts()} 📤 Enviado: ${preview.replace(/\n/g, " ")}`);
}

/**
 * Get your own JID (for sending to yourself)
 * Returns the phone number without device ID
 */
export function getOwnJid(): string | null {
  const fullJid = sock?.user?.id;
  if (!fullJid) return null;

  // JID format is "phone:deviceId@s.whatsapp.net"
  // For sending to yourself, use "phone@s.whatsapp.net"
  const phone = fullJid.split(":")[0];
  return `${phone}@s.whatsapp.net`;
}

/**
 * Disconnect from WhatsApp
 */
export async function disconnect(): Promise<void> {
  if (sock) {
    sock.end(undefined);
    sock = null;
  }
}

export const whatsapp = {
  connect: connectToWhatsApp,
  waitForConnection,
  listenToGroup,
  sendMessage,
  getOwnJid,
  disconnect,
};
