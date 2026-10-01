import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Entrar — Garra" };

export default function Page() {
  return <AuthForm mode="signin" />;
}
