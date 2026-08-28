export type NotificationPreferences = {
  attendance: boolean;
  assignments: boolean;
  messages: boolean;
  diary: boolean;
  feedback: boolean;
  leaves: boolean;
  announcements: boolean;
  transport: boolean;
  general: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  attendance: true,
  assignments: true,
  messages: true,
  diary: true,
  feedback: true,
  leaves: true,
  announcements: true,
  transport: true,
  general: true,
};

export function getNotificationCategory(
  item: { type?: string | null; title?: string | null; message?: string | null }
): keyof NotificationPreferences {
  const t = item.type?.toLowerCase() ?? "";
  const title = item.title?.toLowerCase() ?? "";
  const msg = item.message?.toLowerCase() ?? "";

  // 1. Attendance
  if (
    t === "attendance" ||
    title.includes("attendance") ||
    title.includes("absent") ||
    msg.includes("attendance") ||
    msg.includes("absent")
  ) {
    return "attendance";
  }

  // 2. Assignments
  if (
    t === "assignment" ||
    t === "assignments" ||
    title.includes("assignment") ||
    title.includes("homework") ||
    msg.includes("assignment") ||
    msg.includes("homework")
  ) {
    return "assignments";
  }

  // 3. Messages / Chat
  if (
    t === "message" ||
    t === "messages" ||
    t === "chat" ||
    t === "chatmessage" ||
    t === "direct_message" ||
    title.includes("message") ||
    title.includes("chat") ||
    msg.includes("sent you a message") ||
    msg.includes("chat") ||
    msg.includes("message")
  ) {
    return "messages";
  }

  // 4. Diary
  if (t === "diary" || title.includes("diary") || msg.includes("diary")) {
    return "diary";
  }

  // 5. Feedback
  if (
    t === "feedback" ||
    title.includes("feedback") ||
    title.includes("survey") ||
    msg.includes("feedback") ||
    msg.includes("survey")
  ) {
    return "feedback";
  }

  // 6. Leaves
  if (
    t === "leave" ||
    t === "leaves" ||
    title.includes("leave") ||
    msg.includes("leave request") ||
    msg.includes("leave status") ||
    msg.includes("leave")
  ) {
    return "leaves";
  }

  // 7. Announcements
  if (
    t === "announcement" ||
    t === "announcements" ||
    title.includes("announcement") ||
    msg.includes("announcement")
  ) {
    return "announcements";
  }

  // 8. Transport
  if (
    t === "transport" ||
    t === "bus" ||
    t === "buslocation" ||
    title.includes("transport") ||
    title.includes("bus") ||
    msg.includes("transport") ||
    msg.includes("bus")
  ) {
    return "transport";
  }

  // 9. Default to general
  return "general";
}

export function matchesNotificationCategory(
  item: { type?: string | null; title?: string | null; message?: string | null },
  category: string
): boolean {
  return getNotificationCategory(item) === category;
}

export function isNotificationAllowedByPrefs(
  item: { type?: string | null; title?: string | null; message?: string | null },
  prefs: NotificationPreferences
): boolean {
  if (!prefs) return true;
  const category = getNotificationCategory(item);
  return prefs[category] !== false;
}
