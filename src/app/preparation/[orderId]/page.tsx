import { ProtectedPage } from "@/components/protected-page";
import PreparationDetail from "../preparation-detail";
export default async function Page({params}:{params:Promise<{orderId:string}>}){return <ProtectedPage><PreparationDetail orderId={(await params).orderId}/></ProtectedPage>}
