import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NotificationsList } from "@/components/ui/notifications-list";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const store = getStore();
  const notifications = await store.listNotifications(user.id);

  return (
    <AppShell user={user} notifications={notifications}>
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description="Report releases, quarterly reviews, application updates and account events. Notification state is stored per account."
      />
      <NotificationsList notifications={notifications} />
    </AppShell>
  );
}
