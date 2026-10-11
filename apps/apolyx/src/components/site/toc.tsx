export function TableOfContents({ headings }: { headings: { id: string; title: string }[] }) {
  if (!headings.length) return null;
  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-medium">On this page</p>
      <ul className="space-y-2 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="-ml-px block border-l border-transparent pl-3 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {h.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
