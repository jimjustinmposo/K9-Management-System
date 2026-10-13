import { useEffect, useId, useMemo, useRef, useState } from "react"

export interface SearchableOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  id: string
  value: string
  options: SearchableOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

export default function SearchableSelect({ id, value, options, onChange, placeholder = "Select or search…", className, required, disabled }: SearchableSelectProps) {
  const generatedId = useId()
  const listId = `${generatedId}-options`
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => options.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [options, query])

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", closeOutside)
    return () => document.removeEventListener("mousedown", closeOutside)
  }, [])

  function choose(option: SearchableOption) {
    onChange(option.value)
    setQuery("")
    setOpen(false)
  }

  return <div ref={rootRef} className="relative">
    <input id={id} type="text" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined} autoComplete="off" required={required} disabled={disabled} value={open ? query : selected?.label ?? ""} placeholder={placeholder} className={className} onFocus={() => { setQuery(""); setOpen(true); setActiveIndex(0) }} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); if (value) onChange("") }} onKeyDown={(event) => {
      if (event.key === "Escape") setOpen(false)
      if (event.key === "ArrowDown" && filtered.length) { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)) }
      if (event.key === "ArrowUp" && filtered.length) { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)) }
      if (event.key === "Enter" && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]) }
    }} />
    <input type="hidden" required={required} value={value} />
    {open && <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
      {filtered.length ? filtered.map((option, index) => <li key={option.value} id={`${listId}-${index}`} role="option" aria-selected={option.value === value} className={`cursor-pointer rounded-lg px-3 py-2 text-sm text-ink ${index === activeIndex ? "bg-canvas" : ""}`} onMouseEnter={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>{option.label}</li>) : <li className="px-3 py-2 text-sm text-muted">No options match that search.</li>}
    </ul>}
  </div>
}