import type { ReactNode } from "react";
import { NbaShotChart } from "@/features/scouting/components/profile/nba-shot-chart";
import { queryNbaShotChart } from "@/features/scouting/queries/nba-shot-chart";
import { InsightBarChart } from "@/features/insights/components/insight-bar-chart";
import type { InsightBlock } from "@/lib/insights/catalog";

export async function InsightBody({ blocks }: { blocks: InsightBlock[] }) {
  return (
    <div className="space-y-5 text-[1.02rem] leading-relaxed text-foreground">
      {blocks.map((block, index) => (
        <InsightBlockView key={index} block={block} />
      ))}
    </div>
  );
}

async function InsightBlockView({ block }: { block: InsightBlock }) {
  if (block.type === "heading") {
    const className =
      block.level === 2
        ? "font-display text-2xl font-semibold tracking-tight"
        : "font-display text-xl font-semibold tracking-tight";
    return block.level === 2 ? (
      <h2 className={className}>
        <Inline text={block.text} />
      </h2>
    ) : (
      <h3 className={className}>
        <Inline text={block.text} />
      </h3>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>
            <Inline text={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "image") {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.src} alt={block.alt} className="w-full rounded-sm border border-border" />
        {block.alt ? <figcaption className="text-xs text-muted-foreground">{block.alt}</figcaption> : null}
      </figure>
    );
  }

  if (block.type === "shotChart") {
    const model = await queryNbaShotChart(block.playerId, block.season, { gameId: block.gameId });
    if (model.attempts === 0) return null;
    return <NbaShotChart model={model} />;
  }

  if (block.type === "chart") {
    return (
      <figure className="space-y-3 rounded-sm border border-border bg-card px-4 py-4">
        <figcaption className="font-display text-sm font-semibold tracking-wide">{block.title}</figcaption>
        <InsightBarChart title={block.title} points={block.points} />
        {block.caption ? <p className="text-xs text-muted-foreground">{block.caption}</p> : null}
      </figure>
    );
  }

  return (
    <p className="text-muted-foreground">
      <Inline text={block.text} />
    </p>
  );
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(INLINE.source, "g");
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded-sm bg-muted px-1 py-0.5 text-[0.9em] text-foreground">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link && isSafeHref(link[2])) {
        const external = link[2].startsWith("https://");
        nodes.push(
          <a
            key={key}
            href={link[2]}
            className="text-primary underline-offset-2 hover:underline"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    key += 1;
    last = match.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("..")) return true;
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}
