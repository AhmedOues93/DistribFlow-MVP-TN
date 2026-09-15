import { ProtectedPage } from "@/components/protected-page";
import WarehousesClient from "../inventaire/entrepots/warehouses-client";
export default function Page(){return <ProtectedPage><WarehousesClient/></ProtectedPage>}
