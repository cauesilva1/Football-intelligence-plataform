export function StatsBombAttribution({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <div className="flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
        <div className="flex h-8 items-center rounded-md bg-[#1a1a2e] px-3 font-display text-sm font-bold tracking-tight text-white">
          Stats<span className="text-[#e94560]">Bomb</span>
        </div>
        <p className="max-w-lg text-xs text-muted-foreground">
          Data Source: StatsBomb Open Data —{" "}
          <a
            href="https://github.com/statsbomb/open-data"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            github.com/statsbomb/open-data
          </a>
        </p>
      </div>
    </footer>
  );
}
