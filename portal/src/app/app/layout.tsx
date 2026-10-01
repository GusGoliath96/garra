import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { getUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/entrar");
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo href="/app" />
          <UserMenu name={user.name} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
