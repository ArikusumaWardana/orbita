"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/components/ui/toast-provider";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        showToast("error", getAuthErrorMessage(result.error, "Logout belum berhasil. Coba lagi."));
        return;
      }

      showToast("success", "Logout berhasil. Sampai jumpa lagi.");
      router.push("/auth/sign-in");
      router.refresh();
    } catch (caught) {
      showToast("error", getAuthErrorMessage(caught, "Logout belum berhasil. Coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="theme-toggle sign-out" onClick={signOut} disabled={pending}>
      <LogOut aria-hidden="true" />
      <span>{pending ? "Keluar..." : "Keluar"}</span>
    </button>
  );
}
