import { ProtectedPage } from "@/components/protected-page";
import AlertsClient from "./alerts-client";
export default function Page(){return <ProtectedPage><AlertsClient/></ProtectedPage>}
