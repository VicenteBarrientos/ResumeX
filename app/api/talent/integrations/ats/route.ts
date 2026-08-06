import { requireSession } from "@/lib/require-auth";
import { listOwnedAtsConnections } from "@/lib/ats/ownership";
import { atsErrorResponse, atsJson } from "@/lib/ats/http-response";

export async function GET() {
  try {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const connections = await listOwnedAtsConnections(auth.userId);
    return atsJson({
      connections,
      providers: [
        {
          id: "recruitee",
          name: "Recruitee",
          auth: "personal_api_token",
          modes: ["live"],
        },
        {
          id: "zoho-recruit",
          name: "Zoho Recruit",
          auth: "oauth",
          modes: ["live"],
        },
        {
          id: "ashby",
          name: "Ashby",
          auth: "api_key",
          modes: ["live", "demo", "sandbox"],
        },
      ],
    });
  } catch (error) {
    return atsErrorResponse(error);
  }
}
