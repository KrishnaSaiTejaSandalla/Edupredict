import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import PageHeader from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function ParentOverviewPage() {
  const user = await requireRole("parent");
  const children = await getParentChildren(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <PageHeader
        tag="Parent Portal"
        title="Child Overview"
        description="A comprehensive snapshot of your children's academic profile and key metrics."
      />

      {children.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface p-8 text-center text-sm font-medium text-muted">
          No student profiles are currently linked to your parent account.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {children.map((child) => (
            <div
              key={child.studentId}
              className="rounded-2xl border border-theme bg-surface p-6 space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-primary">{child.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{child.email}</p>
                </div>
                <span className="rounded bg-hover px-2.5 py-1 text-[10px] font-bold text-cyan-400 capitalize">
                  {child.gender || "Student"}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-4 border-t border-subtle pt-4 text-xs">
                <div>
                  <dt className="text-muted font-medium">Class / Section</dt>
                  <dd className="mt-1 font-semibold text-primary">{child.displayClass}</dd>
                </div>
                <div>
                  <dt className="text-muted font-medium">Roll Number</dt>
                  <dd className="mt-1 font-semibold text-primary">{child.rollNumber || "—"}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
