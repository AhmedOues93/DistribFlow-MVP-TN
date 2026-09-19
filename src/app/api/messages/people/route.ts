import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { listPeople } from "@/lib/services/messaging";
export async function GET(request: NextRequest) { try { return jsonOk(await listPeople(await requireRequestContext(request))); } catch (error) { return jsonError(error, 401); } }
