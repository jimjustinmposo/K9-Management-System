export interface SeasonRecord {
  id: string
  k9Id: string
  dogName: string
  nickName: string
  breed: string
  profilePhoto: string
  startDate: string
  endDate: string
  status: "Active" | "Ended"
  notes: string
  createdAt: string
  updatedAt: string
}

export interface SeasonFormValues {
  k9Id: string
  startDate: string
  endDate: string
  notes: string
}

export interface SeasonReminder {
  day: number
  title: string
  date: string
}

const reminderTitles: Record<number, string> = {
  1: "Season started",
  7: "Initial progesterone test reminder",
  9: "Possible fertile window — monitor closely",
  14: "Fertility monitoring reminder",
  21: "Check whether season has ended",
  28: "Follow up if season is still active",
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days - 1)
  return value.toISOString().slice(0, 10)
}

export function getSeasonReminders(startDate: string): SeasonReminder[] {
  return Object.entries(reminderTitles).map(([day, title]) => ({
    day: Number(day), title, date: addDays(startDate, Number(day)),
  }))
}

export function getSeasonDay(startDate: string, date = new Date()): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((today - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1
}