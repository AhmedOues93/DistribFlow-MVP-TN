import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export type StoredObject = { body: Buffer; contentType: string };
export type ObjectStorage = { put(key: string, body: Buffer, contentType: string): Promise<void>; get(key: string): Promise<StoredObject | null>; delete(key: string): Promise<void> };

function safeKey(key: string) { if (!/^[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$/.test(key) || key.includes("..")) throw new Error("Clé de stockage invalide"); return key; }

class LocalStorage implements ObjectStorage {
  private root = process.env.LOCAL_STORAGE_DIR ?? join(process.cwd(), ".local-storage");
  private path(key: string) { const safe = safeKey(key); const target = normalize(join(this.root, safe)); if (!target.startsWith(normalize(this.root) + "/")) throw new Error("Clé de stockage invalide"); return target; }
  async put(key: string, body: Buffer) { const target = this.path(key); await mkdir(dirname(target), { recursive: true }); await writeFile(target, body, { flag: "wx" }); }
  async get(key: string) { try { const body = await readFile(this.path(key)); return { body, contentType: contentTypeFor(key) }; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } }
  async delete(key: string) { try { await unlink(this.path(key)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; } }
}

function contentTypeFor(key: string) { return key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg"; }
function hmac(key: string | Buffer, value: string) { return createHmac("sha256", key).update(value).digest(); }
function encodedPath(value: string) { return value.split("/").map((part) => encodeURIComponent(part)).join("/"); }

class S3Storage implements ObjectStorage {
  private endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "") ?? "";
  private bucket = process.env.S3_BUCKET ?? "";
  private region = process.env.S3_REGION ?? "auto";
  private accessKey = process.env.S3_ACCESS_KEY_ID ?? "";
  private secretKey = process.env.S3_SECRET_ACCESS_KEY ?? "";
  private async request(method: string, key: string, body?: Buffer, contentType?: string) {
    if (!this.endpoint || !this.bucket || !this.accessKey || !this.secretKey) throw new Error("Configuration du stockage objet incomplète");
    const endpoint = new URL(this.endpoint); const path = `${endpoint.pathname.replace(/\/$/, "")}/${encodedPath(this.bucket)}/${encodedPath(safeKey(key))}`; const url = new URL(path, endpoint);
    const now = new Date(); const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); const date = amzDate.slice(0, 8); const payloadHash = createHash("sha256").update(body ?? Buffer.alloc(0)).digest("hex");
    const headers: Record<string, string> = { host: url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate }; if (contentType) headers["content-type"] = contentType;
    const signedHeaders = Object.keys(headers).sort().join(";"); const canonicalHeaders = Object.keys(headers).sort().map((header) => `${header}:${headers[header].trim()}\n`).join(""); const canonical = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n"); const scope = `${date}/${this.region}/s3/aws4_request`; const signingKey = hmac(hmac(hmac(`AWS4${this.secretKey}`, date), this.region), "s3"); const signature = createHmac("sha256", hmac(signingKey, "aws4_request")).update(`AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${createHash("sha256").update(canonical).digest("hex")}`).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`; const response = await fetch(url, { method, headers: { ...headers, Authorization: authorization }, body: body as BodyInit | undefined });
    if (response.status === 404) return null; if (!response.ok) throw new Error("Le stockage de la marque est indisponible"); return response;
  }
  async put(key: string, body: Buffer, contentType: string) { await this.request("PUT", key, body, contentType); }
  async get(key: string) { const response = await this.request("GET", key); if (!response) return null; return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") ?? contentTypeFor(key) }; }
  async delete(key: string) { await this.request("DELETE", key); }
}

export function objectStorage(): ObjectStorage { return (process.env.STORAGE_DRIVER ?? (process.env.NODE_ENV === "production" ? "s3" : "local")) === "s3" ? new S3Storage() : new LocalStorage(); }
