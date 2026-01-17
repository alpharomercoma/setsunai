export function Footer() {
  return (
    <footer className="py-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground sm:justify-between">
        <span>Private, open, and yours.</span>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/alpharomercoma/setsunai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Open Source
          </a>
          <span aria-hidden="true">·</span>
          <a
            href="https://www.linkedin.com/in/alpharomercoma/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Alpha Romer Coma
          </a>
        </div>
      </div>
    </footer>
  );
}
