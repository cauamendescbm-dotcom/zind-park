import { describe, expect, it, vi } from "vitest";
import { openStore } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { pendenciasDeEntrega } from "../src/pendencias.js";
import { MemoryStore } from "../src/store/memory.js";
import type { Store } from "../src/store/types.js";

const config = loadConfig({ DATABASE_URL: "postgresql://x" });

/** Um "Postgres" de mentira: só o que o openStore usa. */
const fakeDb = (ping: () => Promise<void>) => {
  const close = vi.fn(async () => {});
  const store = Object.assign(new MemoryStore(), { ping, close }) as unknown as Store;
  return { store, close };
};

describe("banco fora do ar na partida", () => {
  it("banco respondendo: usa o banco", async () => {
    const db = fakeDb(async () => {});
    const opened = await openStore(config, () => db.store);
    expect(opened.store).toBe(db.store);
    expect(opened.bancoFora).toBeUndefined();
  });

  it("Supabase pausado: não trava, atende em memória e guarda o motivo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = fakeDb(async () => {
      throw new Error("(ENOTFOUND) tenant/user postgres.abc not found");
    });
    const opened = await openStore(config, () => db.store);
    expect(opened.store).not.toBe(db.store);
    expect(opened.store).toBeInstanceOf(MemoryStore);
    expect(opened.bancoFora).toContain("tenant/user");
    expect(db.close).toHaveBeenCalled();
  });

  it("banco que não responde: desiste no tempo limite e cai para a memória", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = fakeDb(() => new Promise(() => {}));
    const opened = await openStore(config, () => db.store, 20);
    expect(opened.store).toBeInstanceOf(MemoryStore);
    expect(opened.bancoFora).toContain("sem resposta");
  });

  it("o /health avisa que está em memória por causa do banco", () => {
    const falta = pendenciasDeEntrega({
      config,
      knowledge: { packages: [], missingCount: 0 },
      canais: [],
      banco: "memoria (banco fora: tenant/user not found)",
    });
    expect(falta.some((f) => f.startsWith("Banco fora do ar"))).toBe(true);
    expect(falta.some((f) => f.startsWith("DATABASE_URL vazio"))).toBe(false);
  });
});
