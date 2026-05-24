function PageShell({ eyebrow, title, description }) {
  return (
    <section className="min-h-[calc(100vh-7rem)]">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-neonGreen">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-black text-white">{title}</h1>
      <p className="mt-4 max-w-sm text-base leading-7 text-white/68">
        {description}
      </p>
      <div className="mt-8 rounded-lg border border-white/10 bg-surface p-4">
        <div className="h-24 rounded-md bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
      </div>
    </section>
  );
}

export default PageShell;
