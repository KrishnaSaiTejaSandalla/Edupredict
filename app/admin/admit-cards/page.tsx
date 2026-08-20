import { requireRole } from '@/lib/auth';
import { getClassesForAdmitCards, getStudentsForAdmitCards } from '@/lib/admit-card-actions';
import AdmitCardsClient from '@/components/admin/AdmitCardsClient';

export const dynamic = 'force-dynamic';

export default async function AdmitCardsPage() {
  const user = await requireRole('admin');
  const schoolId = user.school?.id ?? undefined;

  const [initialClasses, initialStudents] = await Promise.all([
    getClassesForAdmitCards(schoolId),
    getStudentsForAdmitCards({ schoolId }),
  ]);

  return (
    <main className="min-h-screen space-y-8 bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <AdmitCardsClient
        initialClasses={initialClasses}
        initialStudents={initialStudents}
      />
    </main>
  );
}
