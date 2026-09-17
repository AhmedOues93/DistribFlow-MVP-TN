import { ProtectedPage } from "@/components/protected-page";
import OrderDetail from "../order-detail";
export default async function Page({params}:{params:Promise<{orderId:string}>}){return <ProtectedPage><OrderDetail orderId={(await params).orderId}/></ProtectedPage>}
