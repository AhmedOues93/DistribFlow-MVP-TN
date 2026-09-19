import MessagesClient from "@/components/messages-client";
export default async function WorkerConversationPage({ params }: { params: Promise<{ conversationId: string }> }) { return <MessagesClient worker conversationId={(await params).conversationId} />; }
