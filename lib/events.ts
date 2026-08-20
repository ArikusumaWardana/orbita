export type EventReminder = {
  id: string;
  remindAt: string;
  isDefault: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  supportLink: string;
  eventAt: string;
  eventEndAt: string | null;
  reminders: EventReminder[];
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  support_link: string | null;
  event_at: string;
  event_end_at: string | null;
};

export type ReminderRow = {
  id: string;
  event_id: string;
  remind_at: string;
  is_default: boolean;
};

export function eventFromRow(row: EventRow, reminders: ReminderRow[] = []): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    location: row.location ?? "",
    supportLink: row.support_link ?? "",
    eventAt: row.event_at,
    eventEndAt: row.event_end_at,
    reminders: reminders
      .filter((reminder) => reminder.event_id === row.id)
      .map((reminder) => ({
        id: reminder.id,
        remindAt: reminder.remind_at,
        isDefault: reminder.is_default,
      }))
      .sort((a, b) => a.remindAt.localeCompare(b.remindAt)),
  };
}
