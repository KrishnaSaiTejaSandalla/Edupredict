import { requireRole } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/student-dashboard.service";
import StudentDashboardClient from "@/components/student/StudentDashboardClient";

export const dynamic = "force-dynamic";

export default async function StudentPage() {
  const user = await requireRole("student");
  let data = null;
  try {
    data = await getStudentDashboardData(user.id);
  } catch (e) {
    // Student may not have records yet - show empty state
  }

  return <StudentDashboardClient userName={user.name} data={data} />;
}
