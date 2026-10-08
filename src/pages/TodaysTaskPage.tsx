import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppShell } from "../components/AppShell"
import WeatherCard from "../components/WeatherCard"
import { useAuth } from "../lib/auth"

type TaskKind = "walk" | "meal" | "training"
type Task = {
  id: string
  title: string
  detail: string
  time: string
  kind: TaskKind
  done: boolean
  date: string
}

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date())
const initialTasks: Task[] = [
  {
    id: "morning",
    title: "Morning walk",
    detail: "Riverside route · 30 min",
    time: "07:30",
    kind: "walk",
    done: true,
    date: today,
  },
  {
    id: "breakfast",
    title: "Breakfast & supplements",
    detail: "1 cup kibble · Joint support",
    time: "08:15",
    kind: "meal",
    done: true,
    date: today,
  },
  {
    id: "training",
    title: "Training session",
    detail: "Recall & place · 15 min",
    time: "12:30",
    kind: "training",
    done: false,
    date: today,
  },
  {
    id: "evening",
    title: "Evening walk",
    detail: "Neighborhood loop · 25 min",
    time: "18:00",
    kind: "walk",
    done: false,
    date: today,
  },
  {
    id: "dinner",
    title: "Dinner",
    detail: "1 cup kibble",
    time: "19:00",
    kind: "meal",
    done: false,
    date: today,
  },
]

function TaskIcon({
  name,
  className = "size-5",
}: {
  name: TaskKind | "clock" | "plus" | "left" | "right" | "check" | "trash"
  className?: string
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "walk" && (
        <>
          <circle cx="13" cy="4" r="2" />
          <path d="m8 10 3-3 4 3 3 1M11 7l-2 7 5 3 2 4M9 14l-4 7M10 11l4 2" />
        </>
      )}
      {name === "meal" && (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </>
      )}
      {name === "training" && (
        <>
          <ellipse cx="7" cy="8" rx="2" ry="2.5" />
          <ellipse cx="11" cy="5.5" rx="2" ry="2.5" />
          <ellipse cx="16" cy="6" rx="2" ry="2.5" />
          <ellipse cx="19" cy="10" rx="2" ry="2.5" />
          <path d="M7 17c0-2 2-3 3-5 1-2 4-2 5 0 1 2 3 3 3 5 0 4-4 2-5 2s-6 2-6-2Z" />
        </>
      )}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "left" && <path d="m14 6-6 6 6 6" />}
      {name === "right" && <path d="m10 6 6 6-6 6" />}
      {name === "check" && <path d="m5 12 4 4 10-10" />}
      {name === "trash" && (
        <>
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
      )}
    </svg>
  )
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function timeLabel(time: string) {
  const [hour, minute] = time.split(":").map(Number)
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${
    hour < 12 ? "AM" : "PM"
  }`
}

export default function TodaysTaskPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedDate, setSelectedDate] = useState(today)
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00`))
  const [adding, setAdding] = useState(false)
  const date = new Date(`${selectedDate}T12:00:00`)
  const dayTasks = tasks
    .filter((task) => task.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time))
  const completed = dayTasks.filter((task) => task.done).length
  const progress = dayTasks.length
    ? Math.round((completed / dayTasks.length) * 100)
    : 0
  const nextTask = dayTasks.find((task) => !task.done)
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - firstDay.getDay(),
  )
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  )

  function toggleTask(id: string) {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  return (
    <AppShell title="Today's Task">
      <div className="-m-4 min-h-[calc(100vh-5rem)] bg-[#f3f4ed] p-5 text-[#272e26] md:-m-7 md:p-7 lg:-m-8 lg:p-8">
        <div className="mx-auto grid max-w-[1220px] gap-8 xl:grid-cols-[minmax(0,1fr)_288px] xl:gap-11">
          <div>
            <p className="text-xs text-[#747c70]">
              {date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h2 className="mt-1 text-[40px] font-extrabold leading-tight tracking-[-0.055em]">
              {selectedDate === today ? "Today's tasks" : "Daily tasks"}
            </h2>
            <p className="mt-2 text-[13px] text-[#7d8478]">
              A good day starts with a happy pup. {completed} of{" "}
              {dayTasks.length} complete.
            </p>

            <section
              className="mt-7 rounded-[20px] border border-[#dfe3d8] bg-[#fafbf7] p-5 shadow-[0_10px_30px_rgba(44,66,43,0.035)]"
              aria-label="Daily progress"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold">Daily progress</h3>
                  <p className="mt-1 text-[11px] text-[#858c7e]">
                    {progress === 100
                      ? "All done. Great work today!"
                      : "Keep going, you're doing great."}
                  </p>
                </div>
                <span className="text-xl font-extrabold text-[#365e46]">
                  {progress}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-[7px] overflow-hidden rounded-full bg-[#e4e7dd]"
              >
                <div
                  className="h-full rounded-full bg-[#4d7b60] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            <div className="mb-3 mt-7 flex items-center justify-between">
              <h3 className="text-sm font-bold">Schedule</h3>
              <button
                onClick={() => {
                  if (!session?.permissions.create) return
                  setAdding(true)
                }}
                disabled={!session?.permissions.create}
                className="flex items-center gap-1.5 rounded-full bg-[#e5ebdf] px-3 py-2 text-[10px] font-bold text-[#365e46]"
              >
                <TaskIcon name="plus" className="size-3.5" />
                Add task
              </button>
            </div>
            <div className="space-y-2.5">
              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex min-h-[65px] items-center gap-3 rounded-2xl border border-[#dfe3d8] bg-[#fafbf7] px-4 py-3 shadow-[0_5px_20px_rgba(44,66,43,0.02)]"
                >
                  <button
                    disabled={!session?.permissions.edit}
                    aria-label={`${
                      task.done ? "Mark incomplete" : "Mark complete"
                    }: ${task.title}`}
                    aria-pressed={task.done}
                    onClick={() => toggleTask(task.id)}
                    className={`grid size-[19px] shrink-0 place-items-center rounded-[6px] border disabled:cursor-not-allowed disabled:opacity-60 ${
                      task.done
                        ? "border-[#4d7b60] bg-[#4d7b60] text-white"
                        : "border-[#c7cdbf] bg-white text-transparent"
                    }`}
                  >
                    <TaskIcon name="check" className="size-3" />
                  </button>
                  <div
                    className={`grid size-[38px] shrink-0 place-items-center rounded-xl ${
                      task.kind === "training"
                        ? "bg-[#e7e2f7] text-[#6a5eb3]"
                        : task.kind === "walk"
                          ? task.id === "evening"
                            ? "bg-[#dcedf4] text-[#417893]"
                            : "bg-[#e5f3eb] text-[#75a58b]"
                          : task.id === "dinner"
                            ? "bg-[#fce2dd] text-[#b65a46]"
                            : "bg-[#fdf2df] text-[#cd9956]"
                    }`}
                  >
                    <TaskIcon name={task.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] font-semibold ${
                        task.done
                          ? "text-[#8b9286] line-through"
                          : "text-[#272e26]"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-[10px] text-[#7c8475]">
                      {task.detail}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[9px] text-[#646e5e]">
                    <TaskIcon name="clock" className="size-3" />
                    {timeLabel(task.time)}
                  </span>
                  {session?.permissions.delete && <button
                    type="button"
                    aria-label={`Delete task: ${task.title}`}
                    title="Delete task"
                    onClick={() =>
                      setTasks((previous) =>
                        previous.filter((item) => item.id !== task.id),
                      )
                    }
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[#92998a] transition hover:bg-[#fce2dd] hover:text-[#b65a46]"
                  >
                    <TaskIcon name="trash" className="size-4" />
                  </button>}
                </div>
              ))}
              {!dayTasks.length && (
                <div className="rounded-2xl border border-[#dfe3d8] bg-[#fafbf7] p-8 text-center text-sm text-[#7c8475]">
                  No tasks scheduled. Add a task to plan your day.
                </div>
              )}
            </div>
            <p className="mt-4 text-[10px] text-[#92998a]">
              Sample schedule · Changes last for this visit.
            </p>
          </div>

          <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <section className="rounded-[21px] border border-[#dfe3d8] bg-[#fafbf7] p-5 shadow-[0_10px_30px_rgba(44,66,43,0.035)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[13px] font-bold">
                  {month.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <div className="flex gap-1">
                  <button
                    aria-label="Previous month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      )
                    }
                    className="grid size-7 place-items-center rounded-lg text-[#7c8875] hover:bg-[#edf1e8]"
                  >
                    <TaskIcon name="left" className="size-3" />
                  </button>
                  <button
                    aria-label="Next month"
                    onClick={() =>
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      )
                    }
                    className="grid size-7 place-items-center rounded-lg bg-[#f1f4ee] text-[#52745c]"
                  >
                    <TaskIcon name="right" className="size-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[8px] text-[#7b8574]">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <span key={index} className="pb-2">
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day) => {
                  const key = dateKey(day)
                  const hasTasks = tasks.some((task) => task.date === key)
                  return (
                    <button
                      key={key}
                      aria-label={day.toLocaleDateString("en-US", {
                        dateStyle: "full",
                      })}
                      aria-pressed={key === selectedDate}
                      onClick={() => {
                        setSelectedDate(key)
                        if (day.getMonth() !== month.getMonth())
                          setMonth(
                            new Date(day.getFullYear(), day.getMonth(), 1),
                          )
                      }}
                      className={`relative mx-auto grid size-7 place-items-center rounded-full text-[9px] font-semibold transition ${
                        key === selectedDate
                          ? "bg-[#365e46] text-white"
                          : day.getMonth() !== month.getMonth()
                            ? "text-[#b8bdb3] hover:bg-[#edf1e8]"
                            : "text-[#343e30] hover:bg-[#edf1e8]"
                      }`}
                    >
                      {day.getDate()}
                      {hasTasks && key !== selectedDate && (
                        <span className="absolute bottom-0 size-0.5 rounded-full bg-[#6e9a7c]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-[21px] bg-[#365e46] p-5 text-white shadow-[0_15px_30px_rgba(38,76,49,0.13)]">
              <div className="flex justify-between">
                <p className="pt-1 text-[8px] font-medium uppercase tracking-[0.18em] text-[#deeadb]">
                  {nextTask ? "Next up" : "All clear"}
                </p>
                <div className="grid size-8 place-items-center rounded-xl bg-white/10 text-[#d4e6d1]">
                  <TaskIcon
                    name={nextTask?.kind ?? "check"}
                    className="size-4"
                  />
                </div>
              </div>
              <h3 className="mt-0.5 text-base font-bold">
                {nextTask?.title ??
                  (dayTasks.length ? "Everything is done" : "A fresh start")}
              </h3>
              <p className="mt-1 text-xs text-[#d7e3d3]">
                {nextTask?.detail ??
                  (dayTasks.length
                    ? "Enjoy the rest of your day."
                    : "Plan something good for your pup.")}
              </p>
              {nextTask && (
                <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-3">
                  <span className="flex items-center gap-2 text-[11px] font-semibold">
                    <TaskIcon name="clock" className="size-3.5" />
                    {timeLabel(nextTask.time)}
                  </span>
                  <button
                    disabled={!session?.permissions.edit}
                    onClick={() => toggleTask(nextTask.id)}
                    className="rounded-full bg-[#f5f6ee] px-3.5 py-2 text-[9px] font-bold text-[#365e46] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Mark done
                  </button>
                </div>
              )}
            </section>

            <WeatherCard />
          </aside>
        </div>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17271e]/40 p-4"
          onClick={() => setAdding(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setAdding(false)
            }}
            className="w-full max-w-md rounded-3xl bg-[#fafbf7] p-6 shadow-xl"
          >
            <h2 id="add-task-title" className="text-xl font-bold">
              Add task
            </h2>
            <p className="mt-1 text-xs text-muted">
              {date.toLocaleDateString("en-US", { dateStyle: "long" })}
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                const values = new FormData(event.currentTarget)
                const title = String(values.get("title") ?? "").trim()
                if (!title) return
                setTasks((previous) => [
                  ...previous,
                  {
                    id: crypto.randomUUID(),
                    title,
                    detail: String(values.get("detail") ?? "").trim(),
                    time: String(values.get("time")),
                    kind: values.get("kind") as TaskKind,
                    done: false,
                    date: selectedDate,
                  },
                ])
                setAdding(false)
              }}
            >
              <label className="block text-xs font-semibold">
                Task name
                <input
                  autoFocus
                  required
                  name="title"
                  maxLength={100}
                  className="mt-1.5 block w-full rounded-xl border border-[#dfe3d8] bg-white p-3 text-sm"
                  placeholder="e.g. Morning walk"
                />
              </label>
              <label className="block text-xs font-semibold">
                Details
                <input
                  name="detail"
                  maxLength={200}
                  className="mt-1.5 block w-full rounded-xl border border-[#dfe3d8] bg-white p-3 text-sm"
                  placeholder="Route, duration, or notes"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold">
                  Time
                  <input
                    required
                    type="time"
                    name="time"
                    defaultValue="09:00"
                    className="mt-1.5 block w-full rounded-xl border border-[#dfe3d8] bg-white p-3 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Category
                  <select
                    name="kind"
                    className="mt-1.5 block w-full rounded-xl border border-[#dfe3d8] bg-white p-3 text-sm"
                  >
                    <option value="walk">Walk</option>
                    <option value="meal">Meal</option>
                    <option value="training">Training</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-full px-4 py-2 text-sm text-slate"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#365e46] px-5 py-2 text-sm font-semibold text-white"
                >
                  Add task
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  )
}
