/**
 * Reusable page header component — consistent across all panels.
 * Pattern: accent-colored uppercase tag → bold h1 → muted description.
 */
type PageHeaderProps = {
  tag: string;
  title: string;
  description?: string;
};

export default function PageHeader({ tag, title, description }: PageHeaderProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">
        {tag}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
          {description}
        </p>
      )}
    </div>
  );
}
