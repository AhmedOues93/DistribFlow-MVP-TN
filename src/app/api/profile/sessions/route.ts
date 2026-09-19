import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { endOtherSessions } from "@/lib/services/profile";
export async function DELETE(request: NextRequest) { try { return jsonOk(await endOtherSessions(await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
