import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { listNotifications, markNotificationsRead, unreadCount } from "@/lib/services/notifications";
export async function GET(request: NextRequest) { try { const context = await requireRequestContext(request); const unread = request.nextUrl.searchParams.get("unread") === "1"; return jsonOk({ items: await listNotifications(context, unread), unreadCount: await unreadCount(context) }); } catch (error) { return jsonError(error, 401); } }
export async function PATCH(request: NextRequest) { try { return jsonOk(await markNotificationsRead(await parseJson(request), await requireRequestContext(request))); } catch (error) { return jsonError(error); } }
