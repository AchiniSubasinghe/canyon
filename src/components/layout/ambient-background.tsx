export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#0f172a_0%,#080d19_45%,#080d19_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="animate-orb absolute -left-24 top-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      <div
        className="animate-orb absolute right-0 top-1/3 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="animate-orb absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}