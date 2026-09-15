import { ProtectedPage } from "@/components/protected-page";
import StockOperationsClient from "./stock-operations-client";
export default function Page(){return <ProtectedPage><StockOperationsClient/></ProtectedPage>}
