import { ProtectedPage } from "@/components/protected-page";
import NotificationsClient from "@/components/notifications-client";
export default function NotificationsPage() { return <ProtectedPage><NotificationsClient /></ProtectedPage>; }
