import PreparationDetail from "@/app/preparation/preparation-detail";
export default async function WorkerPreparationDetailPage({ params }: { params: Promise<{ orderId: string }> }) { return <PreparationDetail basePath="/travailleur/preparation" orderId={(await params).orderId} />; }
