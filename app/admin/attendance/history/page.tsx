import { redirect } from 'next/navigation';

export default function AttendanceHistoryRedirectPage() {
  redirect('/admin/attendance');
}