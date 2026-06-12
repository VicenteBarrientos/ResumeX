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
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-indigo-50/80 via-white to-white px-4 py-16 dark:bg-[#050816]">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
          ResumeX
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-blue-500 dark:text-[#050816]"
            >
              {action.label}
            </button>
          ))}
      </div>
    </div>
  );
}
