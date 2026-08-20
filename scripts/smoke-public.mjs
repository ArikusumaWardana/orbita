const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

async function check(path, validate) {
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    const body = await response.text();
    const result = validate(response, body);
    console.log(`${result ? "PASS" : "FAIL"} ${path}: HTTP ${response.status}`);
    return result;
  } catch (error) {
    console.log(`FAIL ${path}: ${error instanceof Error ? error.message : "request gagal"}`);
    return false;
  }
}

const results = await Promise.all([
  check("/manifest.webmanifest", (response, body) => response.ok
    && response.headers.get("content-type")?.includes("application/manifest+json") === true
    && body.includes("/pwa/icon-192.png")
    && body.includes("/pwa/icon-maskable-512.png")),
  check("/sw.js", (response, body) => response.ok
    && body.includes('addEventListener("push"')
    && body.includes('addEventListener("fetch"')),
  check("/offline", (response, body) => response.ok && body.includes("Orbita belum dapat terhubung")),
  check("/auth/sign-in", (response, body) => response.ok && body.includes("Masuk")),
  check("/today", (response) => [302, 303, 307, 308].includes(response.status)
    && response.headers.get("location")?.includes("/auth/sign-in") === true),
]);

if (results.some((result) => !result)) {
  console.log("\nSmoke test publik gagal.");
  process.exitCode = 1;
} else {
  console.log("\nSmoke test publik lulus.");
}
