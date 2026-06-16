import { redirect } from "next/navigation";

// The CV Formatter is now the primary experience served at `/`.
// Keep `/formatter` working by redirecting to the homepage.
export default function FormatterPage() {
  redirect("/");
}
