import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { CAREER } from "@/lib/products";

/**
 * `/career` has no page of its own: the Career pitch is the site landing (`/`),
 * so signed-out visitors go there and signed-in ones go straight to the tools.
 */
export default async function CareerIndexPage() {
  const session = await getServerSession(authOptions);
  redirect(session ? CAREER.home : "/");
}
