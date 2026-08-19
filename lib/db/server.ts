import "server-only";

import { handleAuthRequest } from "@neondatabase/auth/server";
import { fetchWithToken, NeonPostgrestClient } from "@neondatabase/postgrest-js";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

type JwtResponse = {
  token?: unknown;
};

function isJwt(value: unknown): value is string {
  return typeof value === "string"
    && value.split(".").length === 3
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

async function getDatabaseJwt() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL belum dikonfigurasi.");

  const incoming = await headers();
  const requestHeaders = new Headers(incoming);
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const request = new Request(`${protocol}://${host}/api/auth/token`, {
    method: "GET",
    headers: requestHeaders,
  });
  const response = await handleAuthRequest(baseUrl, request, "token");
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Sesi tidak valid. Silakan masuk kembali."
      : "Token database belum dapat dibuat. Coba lagi.");
  }

  const payload = await response.json() as JwtResponse;
  if (!isJwt(payload.token)) {
    throw new Error("Token database yang diterima tidak valid. Silakan masuk kembali.");
  }

  return payload.token;
}

export async function getAuthenticatedDatabase() {
  const dataApiUrl = process.env.NEON_DATA_API_URL;
  if (!dataApiUrl) {
    throw new Error("NEON_DATA_API_URL belum dikonfigurasi.");
  }

  const [{ data: session }, token] = await Promise.all([
    auth.getSession(),
    getDatabaseJwt(),
  ]);

  if (!session?.user?.id) {
    throw new Error("Sesi tidak valid. Silakan masuk kembali.");
  }

  return {
    db: new NeonPostgrestClient({
      dataApiUrl,
      options: {
        global: {
          fetch: fetchWithToken(async () => token),
        },
      },
    }),
    user: session.user,
  };
}
