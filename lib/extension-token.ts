import { SignJWT, jwtVerify } from "jose";

const EXTENSION_TOKEN_TYPE = "extension";

function getExtensionSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for extension tokens.");
  }
  return new TextEncoder().encode(secret);
}

export async function signExtensionToken(userId: string) {
  return new SignJWT({ sub: userId, type: EXTENSION_TOKEN_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(getExtensionSecret());
}

export async function verifyExtensionToken(token: string) {
  const { payload } = await jwtVerify(token, getExtensionSecret());
  if (payload.type !== EXTENSION_TOKEN_TYPE || !payload.sub) return null;
  return payload.sub as string;
}
