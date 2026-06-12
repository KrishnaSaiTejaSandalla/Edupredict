/**
 * Translates raw database errors into user-friendly messages.
 * Call this in every server action catch block.
 */
export function parseDbError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'An unexpected error occurred.';

  const err = error as Record<string, unknown>;
  const code = err.code as string | undefined;
  const message = (err.message as string | undefined) ?? '';

  // MySQL duplicate entry
  if (code === 'ER_DUP_ENTRY') {
    if (message.includes('class_roll_unique') || message.includes('roll_number')) {
      return 'Roll number already exists in this class.';
    }
    if (message.includes('email') || message.includes('users_email_unique')) {
      return 'An account with this email already exists.';
    }
    if (message.includes('employee_id') || message.includes('teachers_employee_id')) {
      return 'A teacher with this employee ID already exists.';
    }
    if (message.includes('subjects_code') || message.includes('code')) {
      return 'A subject with this code already exists.';
    }
    if (message.includes('attendance_student_date')) {
      return 'Attendance for this student on this date has already been recorded.';
    }
    return 'This record already exists (duplicate entry).';
  }

  // MySQL foreign key constraint
  if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
    return 'Cannot delete this record because related data exists.';
  }

  // MySQL null constraint
  if (code === 'ER_BAD_NULL_ERROR') {
    return 'Please fill all required fields.';
  }

  // MySQL data too long
  if (code === 'ER_DATA_TOO_LONG') {
    return 'One of the values entered is too long. Please shorten it.';
  }

  // If it's already a user-friendly Error thrown by us, re-use it
  if (error instanceof Error && message && !message.includes('ER_') && !message.includes('errno')) {
    return message;
  }

  return 'An unexpected error occurred. Please try again.';
}
