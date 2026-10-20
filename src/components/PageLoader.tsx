export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
        <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Memuat...</p>
      </div>
    </div>
  );
}
