import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Criar conta · Football Intelligence Platform" };

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-graphite-950 px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-pitch-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-signal-azure/5 blur-3xl" />
      </div>
      <RegisterForm />
    </div>
  );
}
