import { requireRole } from "@/lib/auth";
import { getStudentPerformance } from "@/lib/student-performance.service";
import StudentPerformanceClient from "@/components/student/StudentPerformanceClient";

export const dynamic = "force-dynamic";

export default async function StudentPerformancePage() {
  const user = await requireRole("student");
  let performanceData = null;

  try {
    performanceData = await getStudentPerformance(user.id);
  } catch (e) {
    // Empty state fallback handled in client
  }

  return <StudentPerformanceClient data={performanceData} />;
}
