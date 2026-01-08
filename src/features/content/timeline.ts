import type { ContentItem } from "../../data/dbTypes";

export type TimelineBlock = {
  itemId: string;
  scheduledDate: string; // yyyy-mm-dd
  startDate: string; // yyyy-mm-dd
  days: number;
};

function toDate(d: string) {
  // d = yyyy-mm-dd interpreted in local time; ok for UI timeline
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function toYMD(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeTimeline(item: ContentItem): TimelineBlock | null {
  if (!item.scheduled_date) return null;
  const end = toDate(item.scheduled_date);
  const start = new Date(end);
  start.setDate(end.getDate() - item.timeline_days);
  return {
    itemId: item.id,
    scheduledDate: item.scheduled_date,
    startDate: toYMD(start),
    days: item.timeline_days,
  };
}

// Calendar data transform
export function splitBacklogAndScheduled(items: ContentItem[]) {
  const backlog = [];
  const scheduled = [];
  for (const it of items) {
    if (it.scheduled_date == null) backlog.push(it);
    else scheduled.push(it);
  }
  return { backlog, scheduled };
}