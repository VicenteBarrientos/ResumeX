import { verifyExtensionToken } from "@/lib/extension-token";

export async function getUserIdFromBearer(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    return await verifyExtensionToken(token);
  } catch {
    return null;
  }
}
