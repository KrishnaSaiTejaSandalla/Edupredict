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

export function matchesNotificationCategory(
  item: { type?: string | null; title?: string | null; message?: string | null },
  category: string
): boolean {
  const t = item.type?.toLowerCase() ?? "";
  const title = item.title?.toLowerCase() ?? "";
  const msg = item.message?.toLowerCase() ?? "";

  switch (category) {
    case "attendance":
      return (
        t === "attendance" ||
        title.includes("attendance") ||
        title.includes("absent") ||
        msg.includes("attendance") ||
        msg.includes("absent")
      );
    case "assignments":
      return (
        t === "assignment" ||
        t === "assignments" ||
        title.includes("assignment") ||
        msg.includes("assignment")
      );
    case "messages":
      return (
        t === "message" ||
        t === "messages" ||
        t === "chat" ||
        t === "chatmessage" ||
        title.includes("message") ||
        title.includes("chat") ||
        msg.includes("message") ||
        msg.includes("chat")
      );
    case "diary":
      return t === "diary" || title.includes("diary") || msg.includes("diary");
    case "feedback":
      return t === "feedback" || title.includes("feedback") || msg.includes("feedback");
    case "leaves":
      return t === "leave" || t === "leaves" || title.includes("leave") || msg.includes("leave");
    case "announcements":
      return (
        t === "announcement" ||
        t === "announcements" ||
        title.includes("announcement") ||
        msg.includes("announcement")
      );
    case "transport":
      return (
        t === "transport" ||
        t === "bus" ||
        t === "buslocation" ||
        title.includes("transport") ||
        title.includes("bus") ||
        msg.includes("transport") ||
        msg.includes("bus")
      );
    case "general":
      return (
        t === "general" ||
        t === "info" ||
        t === "academic" ||
        t === "marks" ||
        t === "exam" ||
        t === "exams" ||
        ![
          "attendance",
          "assignment",
          "assignments",
          "message",
          "messages",
          "chat",
          "chatmessage",
          "diary",
          "feedback",
          "leave",
          "leaves",
          "announcement",
          "announcements",
          "transport",
          "bus",
          "buslocation",
        ].includes(t)
      );
    default:
      return true;
  }
}

export function isNotificationAllowedByPrefs(
  item: { type?: string | null; title?: string | null; message?: string | null },
  prefs: NotificationPreferences
): boolean {
  const prefKeys: (keyof NotificationPreferences)[] = [
    "attendance",
    "assignments",
    "messages",
    "diary",
    "feedback",
    "leaves",
    "announcements",
    "transport",
    "general",
  ];

  const enabledKeys = prefKeys.filter((k) => prefs[k]);
  if (enabledKeys.length === 0) return false;

  return enabledKeys.some((k) => matchesNotificationCategory(item, k));
}
