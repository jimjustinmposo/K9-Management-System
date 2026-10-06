import { useEffect, useState } from "react"

type Location = {
  latitude: number
  longitude: number
  label: string
}
type Weather = {
  temperature: number
  code: number
  isDay: boolean
  high: number
  low: number
  updated: string
}
const defaultLocation: Location = {
  latitude: 25.2048,
  longitude: 55.2708,
  label: "Dubai",
}

export function describeWeather(code: number) {
  if (code === 0) return "Clear skies"
  if (code === 1) return "Mostly clear"
  if (code === 2) return "Partly cloudy"
  if (code === 3) return "Overcast"
  if ([45, 48].includes(code)) return "Foggy"
  if ([51, 53, 55].includes(code)) return "Drizzle"
  if ([56, 57, 66, 67].includes(code)) return "Freezing rain"
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Rain"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow"
  if ([95, 96, 99].includes(code)) return "Thunderstorms"
  return "Weather conditions"
}

function WeatherIcon({ code, isDay }: {
  code?: number
  isDay?: boolean
}) {
  const rain =
    code !== undefined &&
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  const snow = code !== undefined && [71, 73, 75, 77, 85, 86].includes(code)
  const storm = code !== undefined && code >= 95
  const cloudy = code !== undefined && code > 1
  return (
    <svg
      aria-hidden="true"
      className="size-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {cloudy ? (
        <>
          <path d="M6 16a4 4 0 1 1 1-8 5 5 0 0 1 9-1 4.5 4.5 0 1 1 2 9H6Z" />
          {rain && <path d="m8 19-1 2m6-2-1 2m6-2-1 2" />}
          {snow && <path d="M8 20h.01M12 22h.01M16 20h.01" />}
          {storm && <path d="m13 14-3 5h4l-2 4" />}
        </>
      ) : isDay === false ? (
        <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />
      ) : (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
        </>
      )}
    </svg>
  )
}

export default function WeatherCard() {
  const [location, setLocation] = useState(defaultLocation)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [locationError, setLocationError] = useState("")
  const [locating, setLocating] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    let controller: AbortController | undefined
    async function load() {
      controller?.abort()
      controller = new AbortController()
      const currentController = controller
      const timeout = setTimeout(() => currentController.abort(), 15000)
      setLoading(true)
      setError("")
      try {
        const params = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current: "temperature_2m,weather_code,is_day",
          daily: "temperature_2m_max,temperature_2m_min",
          timezone: "auto",
          forecast_days: "1",
        })
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params}`,
          { signal: currentController.signal },
        )
        if (!response.ok) throw new Error("Weather request failed")
        const data = await response.json()
        const values = [
          data.current?.temperature_2m,
          data.current?.weather_code,
          data.daily?.temperature_2m_max?.[0],
          data.daily?.temperature_2m_min?.[0],
        ]
        if (
          !values.every(
            (value) => typeof value === "number" && Number.isFinite(value),
          ) ||
          typeof data.current?.time !== "string"
        )
          throw new Error("Weather data unavailable")
        if (active)
          setWeather({
            temperature: values[0],
            code: values[1],
            isDay: data.current.is_day === 1,
            high: values[2],
            low: values[3],
            updated: data.current.time.slice(11, 16),
          })
      } catch {
        if (active) setError("Weather unavailable. Please retry.")
      } finally {
        clearTimeout(timeout)
        if (active) setLoading(false)
      }
    }
    void load()
    const interval = setInterval(() => void load(), 15 * 60 * 1000)
    return () => {
      active = false
      controller?.abort()
      clearInterval(interval)
    }
  }, [location, refresh])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is unavailable in this browser. Showing Dubai.",
      )
      return
    }
    setLocating(true)
    setLocationError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setWeather(null)
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Your location",
        })
        setLocating(false)
      },
      () => {
        setLocating(false)
        setLocationError(
          "Location access unavailable. Showing " + location.label + ".",
        )
      },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  const condition = weather ? describeWeather(weather.code) : ""
  const heading = !weather
    ? loading
      ? "Loading weather…"
      : "Weather unavailable"
    : weather.code >= 95
      ? "Thunderstorms today"
      : weather.temperature >= 30
        ? "Hot weather today"
        : weather.temperature <= 5
          ? "Cold weather today"
          : weather.code >= 51
            ? `${condition} today`
            : weather.code >= 45
              ? "Foggy weather today"
              : weather.code <= 2
                ? "Clear weather today"
                : "Cloudy weather today"

  return (
    <section
      aria-label="Live weather forecast"
      className="rounded-[21px] border border-[#dfe3d8] bg-[#fafbf7] p-5 sm:col-span-2 xl:col-span-1"
    >
      <div className="flex items-center gap-3" aria-live="polite">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff0d6] text-[#d48225]">
          <WeatherIcon code={weather?.code} isDay={weather?.isDay} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold">{heading}</p>
          <p className="mt-1 text-[10px] text-[#7b8474]">
            {weather
              ? `${condition} · ${Math.round(weather.temperature)}°C`
              : loading
                ? "Fetching current conditions"
                : "Check your connection and retry"}
          </p>
          {weather && (
            <p className="mt-1 text-[10px] text-[#7b8474]">
              Today: {Math.round(weather.low)}° / {Math.round(weather.high)}°C
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#7b8474]">
        <span>
          {location.label}
          {weather
            ? ` · ${error ? "Last update" : "Updated"} ${weather.updated}`
            : ""}
        </span>
        <button
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          className="font-semibold text-[#365e46] hover:underline"
        >
          Refresh
        </button>
      </div>
      {(error || locationError) && (
        <p role="status" className="mt-2 text-[10px] text-[#a76538]">
          {error || locationError}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
        <button
          type="button"
          onClick={useMyLocation}
          className="font-semibold text-[#365e46] hover:underline"
        >
          {locating ? "Locating…" : "Use my location"}
        </button>
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="text-[#92998a] hover:underline"
        >
          Open-Meteo
        </a>
      </div>
    </section>
  )
}
