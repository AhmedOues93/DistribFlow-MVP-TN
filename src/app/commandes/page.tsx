import { ProtectedPage } from "@/components/protected-page";
import OrdersClient from "./orders-client";
export default function Page(){return <ProtectedPage><OrdersClient/></ProtectedPage>}
