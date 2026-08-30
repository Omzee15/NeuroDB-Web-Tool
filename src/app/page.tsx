"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { AppShell } from "@/components/layout/AppShell";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="loading" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <ConnectionProvider>
      <AppShell />
    </ConnectionProvider>
  );
}
