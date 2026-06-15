/**
 * Reusable empty-state placeholder for scaffold pages.
 * Uses only theme tokens — no hardcoded colours.
 */
type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-theme bg-surface p-12 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hover text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-primary">{title}</h3>
      {message && (
        <p className="mt-2 mx-auto max-w-md text-sm leading-relaxed text-secondary">
          {message}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
