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
  sendMessage,
  getOwnJid,
  disconnect,
};
