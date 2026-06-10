import ErrorPageLayout from "@/components/ErrorPageLayout";

export default function NotFound() {
  return (
    <ErrorPageLayout
      title="Page not found"
      message="The page you are looking for does not exist or may have been moved."
      action={{ label: "Back to ResumeX", href: "/" }}
    />
  );
}
