import { ProtectedPage } from "@/components/protected-page";
import StockClient from "./stock-client";
export default function StockPage(){return <ProtectedPage><StockClient/></ProtectedPage>}
