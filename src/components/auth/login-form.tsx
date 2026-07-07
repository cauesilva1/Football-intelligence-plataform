"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string>(appConfig.demo.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      router.push("/dashboard");
    } else {
      setError(result.error ?? "Não foi possível entrar.");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pitch-500 text-graphite-950">
          <Trophy className="h-5 w-5" />
        </div>
        <h1 className="font-display text-lg font-bold text-graphite-50">Football Intelligence Platform</h1>
        <p className="text-xs text-graphite-500">Entre para acessar seu painel de scouting</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-graphite-700 bg-graphite-900 p-6 shadow-panel">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@clube.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>

        {error && <p className="rounded-lg border border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-xs text-signal-rose">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <p className="text-center text-xs text-graphite-500">
          Não tem conta? <a href="/register" className="text-pitch-400 hover:underline">Criar conta</a>
        </p>
        <p className="text-center text-[10px] text-muted-foreground">
          Demo: <span className="text-foreground">{appConfig.demo.email}</span> / <span className="text-foreground">{appConfig.demo.password}</span>
        </p>
      </form>
    </div>
  );
}
