import Link from "next/link";
import type { Route } from "next";

/**
 * Standardised KPI stat card matching admin dashboard card pattern.
 * All colour classes use Tailwind dark: modifiers for theme safety.
 */

type ColorScheme = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";

const schemeMap: Record<
  ColorScheme,
  { bgGradient: string; borderCls: string; hoverBorderCls: string; iconBg: string; hoverText: string }
> = {
  blue: {
    bgGradient: "from-blue-500/15 via-blue-400/8 to-white dark:from-blue-500/15 dark:via-blue-400/5 dark:to-transparent",
    borderCls: "border-blue-100 dark:border-blue-500/10",
    hoverBorderCls: "hover:border-blue-300 dark:hover:border-blue-500/30",
    iconBg: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/15 dark:text-blue-500",
    hoverText: "group-hover:text-blue-700 dark:group-hover:text-blue-400",
  },
  violet: {
    bgGradient: "from-violet-500/15 via-indigo-400/8 to-white dark:from-violet-500/15 dark:via-indigo-400/5 dark:to-transparent",
    borderCls: "border-indigo-100 dark:border-indigo-500/10",
    hoverBorderCls: "hover:border-indigo-300 dark:hover:border-indigo-500/30",
    iconBg: "bg-violet-500/15 text-violet-700 dark:bg-violet-500/15 dark:text-violet-500",
    hoverText: "group-hover:text-violet-700 dark:group-hover:text-violet-400",
  },
  emerald: {
    bgGradient: "from-emerald-500/15 via-green-400/8 to-white dark:from-emerald-500/15 dark:via-green-400/5 dark:to-transparent",
    borderCls: "border-emerald-100 dark:border-emerald-500/10",
    hoverBorderCls: "hover:border-emerald-300 dark:hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-500",
    hoverText: "group-hover:text-emerald-700 dark:group-hover:text-emerald-400",
  },
  amber: {
    bgGradient: "from-amber-500/15 via-yellow-400/8 to-white dark:from-amber-500/15 dark:via-yellow-400/5 dark:to-transparent",
    borderCls: "border-amber-100 dark:border-amber-500/10",
    hoverBorderCls: "hover:border-amber-300 dark:hover:border-amber-500/30",
    iconBg: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/15 dark:text-amber-500",
    hoverText: "group-hover:text-amber-700 dark:group-hover:text-amber-400",
  },
  rose: {
    bgGradient: "from-rose-500/15 via-pink-400/8 to-white dark:from-rose-500/15 dark:via-pink-400/5 dark:to-transparent",
    borderCls: "border-rose-100 dark:border-rose-500/10",
    hoverBorderCls: "hover:border-rose-300 dark:hover:border-rose-500/30",
    iconBg: "bg-rose-500/15 text-rose-700 dark:bg-rose-500/15 dark:text-rose-500",
    hoverText: "group-hover:text-rose-700 dark:group-hover:text-rose-400",
  },
  cyan: {
    bgGradient: "from-cyan-500/15 via-cyan-400/8 to-white dark:from-cyan-500/15 dark:via-cyan-400/5 dark:to-transparent",
    borderCls: "border-cyan-100 dark:border-cyan-500/10",
    hoverBorderCls: "hover:border-cyan-300 dark:hover:border-cyan-500/30",
    iconBg: "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-500",
    hoverText: "group-hover:text-cyan-700 dark:group-hover:text-cyan-400",
  },
};

type KpiCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorScheme?: ColorScheme;
  href?: string;
};

export default function KpiCard({
  label,
  value,
  icon,
  colorScheme = "blue",
  href,
}: KpiCardProps) {
  const s = schemeMap[colorScheme];

  const inner = (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p
          className={`mt-3 text-3xl font-bold tracking-tight text-foreground ${s.hoverText} transition duration-300`}
        >
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${s.iconBg} group-hover:scale-110`}
      >
        {icon}
      </div>
    </div>
  );

  const cls = `rounded-2xl border bg-gradient-to-br p-6 shadow-sm hover:-translate-y-1 transition-all duration-300 group ${s.bgGradient} ${s.borderCls} ${s.hoverBorderCls}`;

  if (href) {
    return (
      <Link href={href as Route} className={cls}>
        {inner}
      </Link>
    );
  }

  return <div className={cls}>{inner}</div>;
}
