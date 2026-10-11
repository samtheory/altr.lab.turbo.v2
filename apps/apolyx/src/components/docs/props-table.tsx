export type PropRow = {
  prop: string;
  type: string;
  default?: string;
  description: string;
};

export function PropsTable({ title, rows }: { title?: string; rows: PropRow[] }) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        {title ? (
          <caption className="border-b border-border bg-muted/40 px-4 py-2 text-left font-mono text-xs text-muted-foreground">
            {title}
          </caption>
        ) : null}
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Prop</th>
            <th scope="col" className="px-4 py-2 font-medium">Type</th>
            <th scope="col" className="px-4 py-2 font-medium">Default</th>
            <th scope="col" className="px-4 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.prop} className="border-t border-border align-top">
              <td className="px-4 py-2 font-mono text-xs font-medium text-foreground">{row.prop}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.type}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.default ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
