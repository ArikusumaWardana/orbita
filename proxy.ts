import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/((?!api/auth|api/cron|auth|offline|pwa|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)"],
};
