/**
 * WhatsApp Service using Baileys
 * Handles connection and message sending
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
// @ts-ignore - no types available
import qrcode from "qrcode-terminal";

const AUTH_FOLDER = ".whatsapp-auth";

let sock: WASocket | null = null;

/**
 * Connect to WhatsApp
 * Will show QR code on first connection
 */
export async function connectToWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR manually
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
}) => void;

let messageCallback: MessageCallback | null = null;

/**
 * Start listening for messages from a specific group
 * @param groupJid - The group JID (e.g., "123456789@g.us")
 * @param callback - Function to call when a message is received
 */
export function listenToGroup(
  groupJid: string,
  callback: MessageCallback
): void {
  if (!sock) {
    throw new Error("WhatsApp not connected");
  }

  targetGroupJid = groupJid;
  messageCallback = callback;

  sock.ev.on("messages.upsert", (m) => {
    for (const msg of m.messages) {
      const remoteJid = msg.key.remoteJid;

      // Skip if no remote JID
      if (!remoteJid) continue;

      // Skip if not from target group (if target is specified)
      if (targetGroupJid && remoteJid !== targetGroupJid) continue;

      // Note: Not skipping fromMe to allow seeing own messages for testing

      // Extract message text
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      if (!text) continue;

      // Get sender info
      const sender = msg.key.participant || msg.key.remoteJid || "unknown";
      const isGroup = remoteJid.endsWith("@g.us");

      console.log("\n📩 Message received:");
      console.log(`   From: ${remoteJid}`);
      console.log(`   Sender: ${sender}`);
      console.log(`   Text: ${text}`);
      console.log(`   IsGroup: ${isGroup}`);

      if (messageCallback) {
        messageCallback({
          from: remoteJid,
          sender,
          text,
          timestamp: new Date((msg.messageTimestamp as number) * 1000),
          isGroup,
        });
      }
    }
  });

  console.log(`\n👂 Listening to group: ${groupJid}`);
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
 * @param jid - WhatsApp ID (phone@s.whatsapp.net)
 * @param text - Message text
 */
export async function sendMessage(jid: string, text: string): Promise<void> {
  if (!sock) {
    throw new Error("WhatsApp not connected");
  }

  await sock.sendMessage(jid, { text });
  console.log(`📤 Message sent to ${jid}`);
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
