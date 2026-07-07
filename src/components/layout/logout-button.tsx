"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/session";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
