import { ProtectedPage } from "@/components/protected-page";
import MovementsClient from "./movements-client";
export default function Page(){return <ProtectedPage><MovementsClient/></ProtectedPage>}
