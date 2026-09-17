import { ProtectedPage } from "@/components/protected-page";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() { return <ProtectedPage><DashboardClient /></ProtectedPage>; }
