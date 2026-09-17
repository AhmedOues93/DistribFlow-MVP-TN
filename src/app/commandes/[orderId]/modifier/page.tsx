import { ProtectedPage } from "@/components/protected-page";
import OrderEditor from "../../order-editor";
export default async function Page({params}:{params:Promise<{orderId:string}>}){return <ProtectedPage><OrderEditor orderId={(await params).orderId}/></ProtectedPage>}
