import type { K9FormValues, K9Record } from "../types/k9";

const STORAGE_KEY = "sentinel-k9-roster-v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k9-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readLocal(): K9Record[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(records: K9Record[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    // storage unavailable or quota exceeded (large photos)
    return false;
  }
}

export function normalizeK9(record: K9Record): K9Record {
  return {
    ...record,
    profilePhoto: record.profilePhoto ?? "",
    dogName: record.dogName ?? "",
    nickName: record.nickName ?? "",
    breed: record.breed ?? "",
    dateOfBirth: record.dateOfBirth ?? "",
    sex: record.sex ?? "",
    status: record.status ?? "",
    microchipNumber: record.microchipNumber ?? "",
    fatherSire: record.fatherSire ?? "",
    motherDam: record.motherDam ?? "",
    notes: record.notes ?? "",
  };
}

async function parseJsonSafely(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isJsonResponse(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("application/json");
}

function serverMessage(data: any): string {
  if (data && typeof data.error === "string" && data.error.trim()) {
    const detail = typeof data.detail === "string" && data.detail.trim() ? ` (${data.detail.trim()})` : "";
    return `${data.error.trim()}${detail}`;
  }
  if (data && typeof data.message === "string" && data.message.trim()) return data.message.trim();
  return "";
}

function saveLocalRecord(values: K9FormValues): K9Record {
  const record: K9Record = normalizeK9({
    ...values,
    id: uid(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  const ok = writeLocal([...readLocal(), record]);
  if (!ok) {
    throw new Error("Browser storage is full — remove the profile photo or use a smaller image, then save again.");
  }
  return record;
}

function updateLocalRecord(id: string, values: K9FormValues): K9Record {
  const local = readLocal();
  let updated: K9Record | null = null;
  const next = local.map((k9) => {
    if (k9.id !== id) return k9;
    updated = normalizeK9({ ...k9, ...values, updatedAt: nowIso() });
    return updated;
  });
  if (!updated) throw new Error("K9 record not found");
  const ok = writeLocal(next);
  if (!ok) {
    throw new Error("Browser storage is full — remove the profile photo or use a smaller image, then save again.");
  }
  return updated;
}

function filterLocal(search: string): K9Record[] {
  const local = readLocal().map(normalizeK9);
  const term = search.trim().toLowerCase();
  const sorted = local.sort((a, b) => a.dogName.localeCompare(b.dogName));
  if (!term) return sorted;
  return sorted.filter((k9) =>
    [k9.dogName, k9.nickName, k9.breed, k9.microchipNumber]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

function mapRow(row: any): K9Record {
  return normalizeK9({
    id: String(row.id ?? row.Id ?? uid()),
    profilePhoto: row.profile_photo ?? row.profilePhoto ?? "",
    dogName: row.dog_name ?? row.dogName ?? "",
    nickName: row.nick_name ?? row.nickName ?? "",
    breed: row.breed ?? "",
    dateOfBirth: row.date_of_birth ?? row.dateOfBirth ?? "",
    sex: row.sex ?? "",
    status: row.status ?? "",
    microchipNumber: row.microchip_number ?? row.microchipNumber ?? "",
    fatherSire: row.father_sire ?? row.fatherSire ?? "",
    motherDam: row.mother_dam ?? row.motherDam ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at ?? row.createdAt ?? nowIso(),
    updatedAt: row.updated_at ?? row.updatedAt ?? nowIso(),
  });
}

function toPayload(values: K9FormValues) {
  return {
    profile_photo: values.profilePhoto,
    dog_name: values.dogName.trim(),
    nick_name: values.nickName.trim(),
    breed: values.breed,
    date_of_birth: values.dateOfBirth || null,
    sex: values.sex || null,
    status: values.status || null,
    microchip_number: values.microchipNumber.trim() || null,
    father_sire: values.fatherSire.trim() || null,
    mother_dam: values.motherDam.trim() || null,
    notes: values.notes.trim() || null,
  };
}

export const k9Api = {
  async list(search = ""): Promise<K9Record[]> {
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    let res: Response;
    try {
      res = await fetch(`/api/k9${query}`);
    } catch {
      return filterLocal(search);
    }
    // No Pages Functions backend (plain `vite dev` serves index.html for
    // unknown routes with status 200). Fall back to browser storage so
    // saves remain visible instead of showing an empty roster.
    if (!isJsonResponse(res)) return filterLocal(search);
    const data = await parseJsonSafely(res);
    if (!res.ok) {
      throw new Error(serverMessage(data) || `Load failed with status ${res.status}.`);
    }
    const rows = Array.isArray(data) ? data : data?.data ?? [];
    return rows.map(mapRow);
  },

  async get(id: string): Promise<K9Record | null> {
    let res: Response;
    try {
      res = await fetch(`/api/k9/${encodeURIComponent(id)}`);
    } catch {
      return readLocal().find((k9) => k9.id === id) ?? null;
    }
    if (!isJsonResponse(res)) {
      return readLocal().find((k9) => k9.id === id) ?? null;
    }
    if (res.status === 404) return null;
    const data = await parseJsonSafely(res);
    if (!res.ok) {
      throw new Error(serverMessage(data) || `Load failed with status ${res.status}.`);
    }
    return data ? mapRow(data.data ?? data) : null;
  },

  async create(values: K9FormValues): Promise<K9Record> {
    let res: Response;
    try {
      res = await fetch("/api/k9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
    } catch {
      return saveLocalRecord(values);
    }
    if (!isJsonResponse(res)) return saveLocalRecord(values);
    const data = await parseJsonSafely(res);
    if (!res.ok) {
      throw new Error(serverMessage(data) || `Save failed with status ${res.status}.`);
    }
    if (data) return mapRow(data.data ?? data);
    throw new Error("Save failed: empty API response.");
  },

  async update(id: string, values: K9FormValues): Promise<K9Record> {
    let res: Response;
    try {
      res = await fetch(`/api/k9/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
    } catch {
      return updateLocalRecord(id, values);
    }
    if (!isJsonResponse(res)) return updateLocalRecord(id, values);
    const data = await parseJsonSafely(res);
    if (!res.ok) {
      throw new Error(serverMessage(data) || `Save failed with status ${res.status}.`);
    }
    if (data) return mapRow(data.data ?? data);
    throw new Error("Save failed: empty API response.");
  },

  async remove(id: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`/api/k9/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      writeLocal(readLocal().filter((k9) => k9.id !== id));
      return;
    }
    // No backend in plain `vite dev` — delete locally.
    if (!isJsonResponse(res)) {
      writeLocal(readLocal().filter((k9) => k9.id !== id));
      return;
    }
    if (!res.ok && res.status !== 404) {
      const data = await parseJsonSafely(res);
      throw new Error(serverMessage(data) || `Delete failed with status ${res.status}.`);
    }
  },
};

