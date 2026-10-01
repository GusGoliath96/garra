"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  INVALID_EMAIL: "E-mail inválido.",
};

export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = signup
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    setLoading(false);
    if (res.error) {
      setError(ERRORS[res.error.code ?? ""] ?? res.error.message ?? "Algo deu errado.");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md space-y-5 p-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {signup ? "Crie sua conta" : "Que bom te ver de novo"}
        </h1>
        <p className="mt-1.5 text-ink-soft">
          {signup ? "Em 5 minutos sua assistente executiva estará trabalhando." : "Entre para gerenciar sua assistente."}
        </p>
      </div>
      {signup && (
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          className="input"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {signup && <p className="mt-1.5 text-xs text-ink-soft">Mínimo de 8 caracteres.</p>}
      </div>
      {error && <p className="rounded-xl bg-coral-soft px-4 py-2.5 text-sm text-coral-deep">{error}</p>}
      <button className="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        {signup ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link href={signup ? "/entrar" : "/cadastro"} className="font-semibold text-coral-deep hover:underline">
          {signup ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
