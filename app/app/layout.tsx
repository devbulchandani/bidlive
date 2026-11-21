import { AppShell } from "@/components/shell/AppShell";
import { IdentityProvider } from "@/lib/client/identity-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <IdentityProvider>
      <AppShell>{children}</AppShell>
    </IdentityProvider>
  );
}
