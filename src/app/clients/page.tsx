import { ProtectedPage } from "@/components/protected-page";
import CustomersClient from "./customers-client";

export default function CustomersPage() {
  return <ProtectedPage><CustomersClient /></ProtectedPage>;
}
