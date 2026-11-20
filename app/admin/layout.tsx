import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["admin"]);
  const store = getStore();
  const notifications = await store.listNotifications(user.id);
  return (
    <AppShell user={user} notifications={notifications}>
      {children}
    </AppShell>
  );
}
