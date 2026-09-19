export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  let payload: unknown = {};
  if (text && contentType.includes("application/json")) {
    try { payload = JSON.parse(text); } catch { payload = {}; }
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Le serveur n’a pas pu traiter la demande.";
    throw new Error(message);
  }
  return payload as T;
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, { cache: "no-store", ...init });
  return readJsonResponse<T>(response);
}
