import { Fragment, type ReactNode } from "react";

// Deliberately small Markdown vocabulary. React escapes every text node; there is
// no HTML parser, URL handling, image loading or dangerouslySetInnerHTML path.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/u).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith("`") && part.endsWith("`") ? (
      <code key={index} className="break-words rounded bg-muted px-1 py-0.5 text-[0.85em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    )
  );
}
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/gu, "")
    .split("|")
    .map((cell) => cell.trim());
const separator = (line: string) => cells(line).every((cell) => /^:?-{3,}:?$/u.test(cell));
const listItem = (line: string) => /^\s*(?:[-*+] |\d+[.)] )/u.test(line);

/** Safe display subset: paragraphs, bold, inline code, lists and small tables. */
export function MintMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/gu, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index++;
      continue;
    }
    if (line.includes("|") && separator(lines[index + 1] ?? "")) {
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index]?.includes("|")) rows.push(cells(lines[index++] ?? ""));
      blocks.push(
        <div key={index} className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                {headers.map((header, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-medium">
                    {inline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {headers.map((_, j) => (
                    <td key={j} className="px-3 py-2 align-top">
                      {inline(row[j] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (listItem(line)) {
      const ordered = /^\s*\d/u.test(line);
      const items: string[] = [];
      while (index < lines.length && listItem(lines[index] ?? "") && /^\s*\d/u.test(lines[index] ?? "") === ordered)
        items.push((lines[index++] ?? "").replace(/^\s*(?:[-*+] |\d+[.)] )/u, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={index} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5`}>
          {items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </List>
      );
    } else {
      const paragraph = [line];
      index++;
      while (
        index < lines.length &&
        lines[index]?.trim() &&
        !listItem(lines[index] ?? "") &&
        !(lines[index]?.includes("|") && separator(lines[index + 1] ?? ""))
      )
        paragraph.push(lines[index++] ?? "");
      blocks.push(
        <p key={index} className="whitespace-pre-line">
          {inline(paragraph.join("\n"))}
        </p>
      );
    }
  }
  return <div className="space-y-3 break-words text-sm leading-7">{blocks}</div>;
}
