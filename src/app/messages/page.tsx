import { ProtectedPage } from "@/components/protected-page";
import MessagesClient from "@/components/messages-client";
export default function MessagesPage() { return <ProtectedPage><MessagesClient /></ProtectedPage>; }
