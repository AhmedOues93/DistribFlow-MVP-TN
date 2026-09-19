import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { getProfile, updateProfile } from "@/lib/services/profile";
export async function GET(request: NextRequest) { try { return jsonOk(await getProfile(await requireRequestContext(request))); } catch (error) { return jsonError(error, 401); } }
export async function PATCH(request: NextRequest) { try { return jsonOk(await updateProfile(await parseJson(request), await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
