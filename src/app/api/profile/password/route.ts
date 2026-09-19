import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { changePassword } from "@/lib/services/profile";
export async function POST(request: NextRequest) { try { return jsonOk(await changePassword(await parseJson(request), await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
