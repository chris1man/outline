import type { TimesheetEntry } from "@server/models";

export default function presentTimesheetEntry(entry: TimesheetEntry) {
  return {
    id: entry.id,
    teamId: entry.teamId,
    userId: entry.userId,
    userName: entry.user?.name,
    userAvatarUrl: entry.user?.avatarUrl,
    userRole: entry.user?.role,
    date: entry.date,
    hours: Number(entry.hours),
    comment: entry.comment,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}
