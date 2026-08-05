import Link from "next/link";

interface ErrorPageLayoutProps {
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function ErrorPageLayout({
  title,
  message,
  action,
}: ErrorPageLayoutProps) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          ResumeX
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {message}
        </p>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
            >
              {action.label}
            </button>
          ))}
      </div>
    </div>
  );
}
