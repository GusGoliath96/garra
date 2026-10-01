"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-ink-soft sm:inline">Olá, {name.split(" ")[0]}</span>
      <button
        className="btn-ghost py-2"
        onClick={async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Sair
      </button>
    </div>
  );
}
