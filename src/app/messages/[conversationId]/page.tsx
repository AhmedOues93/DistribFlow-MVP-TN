import { ProtectedPage } from "@/components/protected-page";
import MessagesClient from "@/components/messages-client";
export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) { return <ProtectedPage><MessagesClient conversationId={(await params).conversationId} /></ProtectedPage>; }
