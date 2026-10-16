import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { poolConfig } from "../src/store/postgres.js";

describe("conexão com o banco", () => {
  it("no Supabase usa SSL e confere o certificado com o raiz do Supabase", () => {
    const cfg = poolConfig("postgresql://postgres.abc:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres");
    const ssl = cfg.ssl as { ca: string; rejectUnauthorized?: boolean };
    expect(ssl.rejectUnauthorized).toBeUndefined(); // padrão do Node: confere o certificado
    const ca = new X509Certificate(ssl.ca);
    expect(ca.subject).toContain("Supabase Root 2021 CA");
    expect(new Date(ca.validTo).getTime()).toBeGreaterThan(Date.now());
    expect(poolConfig("postgresql://postgres:senha@db.abc.supabase.co:5432/postgres").ssl).toBeTruthy();
  });

  it("respeita o sslmode da URL e não mexe em outros bancos", () => {
    expect(poolConfig("postgresql://u:s@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=disable").ssl).toBeUndefined();
    expect(poolConfig("postgresql://postgres@/zind?host=/tmp&port=5433").ssl).toBeUndefined();
    expect(poolConfig("postgresql://u:s@localhost:5432/zind").ssl).toBeUndefined();
    expect(poolConfig("postgresql://u:s@supabase.com.evil.example/zind").ssl).toBeUndefined();
  });
});
