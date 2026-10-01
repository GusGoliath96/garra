import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM para segredos que o portal precisa guardar (ex.: token do gateway da cell).
// Formato: v1.<iv>.<tag>.<ciphertext> (base64url)

function key(): Buffer {
  const raw = process.env.APP_SECRET_KEY;
  if (!raw) throw new Error("APP_SECRET_KEY não configurada");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("APP_SECRET_KEY precisa ter 32 bytes (base64)");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

export function decrypt(blob: string): string {
  const [v, iv, tag, ct] = blob.split(".");
  if (v !== "v1") throw new Error("formato de segredo desconhecido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
