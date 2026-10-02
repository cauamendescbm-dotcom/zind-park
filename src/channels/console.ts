import type { Channel } from "../store/types.js";
import type { ChannelAdapter, StaffNotifier } from "./types.js";

/** Canal de mentira para o simulador: imprime no terminal. */
export class ConsoleChannel implements ChannelAdapter {
  constructor(public readonly channel: Channel = "whatsapp") {}

  async showTyping() {
    process.stdout.write("\x1b[2m  digitando...\x1b[0m\r");
  }

  async sendText(_to: string, text: string) {
    process.stdout.write("\x1b[2K");
    const lines = text.split("\n").map((l) => `  \x1b[32m${l}\x1b[0m`);
    console.log(lines.join("\n"));
    return null;
  }
}

export class ConsoleStaffNotifier implements StaffNotifier {
  async notifyOrganizer(_kind: string, message: string) {
    console.log(`\n\x1b[33m┌─ WhatsApp da organizadora ─────────────\n${message
      .split("\n")
      .map((l) => "│ " + l)
      .join("\n")}\n└────────────────────────────────────────\x1b[0m\n`);
  }
}
