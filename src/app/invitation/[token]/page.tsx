import InvitationClient from "./invitation-client";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) { return <InvitationClient token={(await params).token} />; }
