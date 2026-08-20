import { existsSync, readFileSync } from "node:fs";

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
      return [key, value];
    }));
}

const fileEnv = readEnvFile(".env.local");
const env = { ...fileEnv, ...process.env };
const required = [
  ["NEON_AUTH_BASE_URL", "Neon Auth"],
  ["NEON_AUTH_COOKIE_SECRET", "cookie sesi"],
  ["NEON_DATA_API_URL", "Neon Data API"],
  ["DATABASE_URL", "cron reminder"],
  ["CRON_SECRET", "otorisasi cron"],
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Web Push client"],
  ["VAPID_PRIVATE_KEY", "Web Push server"],
  ["VAPID_SUBJECT", "identitas Web Push"],
  ["GEMINI_API_KEY", "AI Assistant"],
];

let failed = false;
for (const [key, purpose] of required) {
  const value = env[key]?.trim();
  const valid = Boolean(value && !/^<.*>$/.test(value));
  console.log(`${valid ? "PASS" : "FAIL"} ${key}: ${valid ? "tersedia" : `dibutuhkan untuk ${purpose}`}`);
  if (!valid) failed = true;
}

const urlKeys = ["NEON_AUTH_BASE_URL", "NEON_DATA_API_URL", "DATABASE_URL"];
for (const key of urlKeys) {
  const value = env[key]?.trim();
  if (!value) continue;
  try {
    const parsed = new URL(value);
    if (!["https:", "postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error();
  } catch {
    failed = true;
    console.log(`FAIL ${key}: format URL tidak valid`);
  }
}

if (env.NEON_AUTH_COOKIE_SECRET && env.NEON_AUTH_COOKIE_SECRET.length < 32) {
  failed = true;
  console.log("FAIL NEON_AUTH_COOKIE_SECRET: gunakan minimal 32 karakter");
}

console.log(failed ? "\nDeployment belum siap." : "\nEnvironment deployment siap.");
process.exitCode = failed ? 1 : 0;
