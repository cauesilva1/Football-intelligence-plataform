import { buttonVariants } from "@/components/ui/button";
import { resolveNewsletterUrl } from "@/lib/insights/catalog";
import { cn } from "@/lib/utils";

export function NewsletterSignup() {
  const href = resolveNewsletterUrl(process.env.NEXT_PUBLIC_NEWSLETTER_URL);

  return (
    <section className="rounded-sm border border-border bg-card px-5 py-5 md:px-6" aria-label="Newsletter signup">
      <p className="desk-kicker">Substack</p>
      <h2 className="font-display text-2xl font-semibold tracking-tight">Read the next edition in your inbox</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Delivery stays on Substack. This page keeps the archive — one question, the data, and one chart.
      </p>
      {href ? (
        <a
          href={href}
          className={cn(buttonVariants(), "mt-4")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Subscribe on Substack
        </a>
      ) : (
        <p className="mt-4 max-w-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          The subscribe link is not published yet. Editions will still be archived here when they go out.
        </p>
      )}
    </section>
  );
}
