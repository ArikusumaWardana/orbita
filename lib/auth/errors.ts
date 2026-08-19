type AuthErrorLike = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [/invalid.*(password|credential)|password.*invalid|incorrect.*password|user.*not.*found/i, "Email atau password tidak cocok."],
  [/email.*not.*verified|verify.*email/i, "Email belum diverifikasi. Masukkan kode OTP yang dikirim ke emailmu."],
  [/already.*exist|user.*exist|email.*taken/i, "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain."],
  [/invalid.*otp|otp.*invalid|otp.*expired|expired.*otp/i, "Kode OTP tidak valid atau sudah kedaluwarsa."],
  [/too.*many|rate.*limit/i, "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."],
  [/network|fetch|connection|offline/i, "Tidak dapat terhubung ke layanan akun. Periksa koneksi lalu coba lagi."],
];

export function getAuthErrorMessage(error: unknown, fallback: string) {
  const candidate = error && typeof error === "object" ? error as AuthErrorLike : null;
  const source = [candidate?.code, candidate?.message, typeof error === "string" ? error : ""]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  for (const [pattern, message] of AUTH_MESSAGES) {
    if (pattern.test(source)) return message;
  }

  if (candidate?.status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  if (typeof candidate?.status === "number" && candidate.status >= 500) {
    return "Layanan akun sedang bermasalah. Coba lagi beberapa saat lagi.";
  }

  return fallback;
}
