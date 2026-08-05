export default function TalentMapperLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-zinc-200 dark:bg-white/10" />
      <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100 dark:bg-white/5" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
  );
}
