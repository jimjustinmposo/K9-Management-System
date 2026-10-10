import { k9Api } from "./k9Api";
import type { BoardingFormValues, BoardingRecord } from "../types/boarding";
import type { K9Record } from "../types/k9";

const STORAGE_KEY = "sentinel-boarding-v1";
type StoredRecord = Omit<BoardingRecord, "k9">;

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `boarding-${Date.now()}`;
}

function readLocal(): StoredRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function mapRow(row: any, dogs: K9Record[]): BoardingRecord {
  const k9Id = String(row.k9_id ?? row.k9Id ?? "");
  const dog = dogs.find((item) => item.id === k9Id);
  return {
    id: String(row.id), k9Id,
    ownerName: row.owner_name ?? row.ownerName ?? "",
    ownerPhone: row.owner_phone ?? row.ownerPhone ?? "",
    checkInDate: row.check_in_date ?? row.checkInDate ?? "",
    checkOutDate: row.check_out_date ?? row.checkOutDate ?? "",
    status: row.status === "Checked Out" ? "Checked Out" : "Boarding",
    notes: row.notes ?? "", createdAt: row.created_at ?? row.createdAt ?? "",
    updatedAt: row.updated_at ?? row.updatedAt ?? "",
    k9: {
      id: k9Id,
      dogName: row.dog_name ?? dog?.dogName ?? "Registered K9",
      nickName: row.nick_name ?? dog?.nickName ?? "",
      breed: row.breed ?? dog?.breed ?? "",
      profilePhoto: row.profile_photo ?? dog?.profilePhoto ?? "",
    },
  };
}

function payload(values: BoardingFormValues) {
  return {
    k9_id: values.k9Id, owner_name: values.ownerName.trim(), owner_phone: values.ownerPhone.trim(),
    check_in_date: values.checkInDate, check_out_date: values.checkOutDate,
    status: values.status, notes: values.notes.trim(),
  };
}

async function jsonResponse(response: Response): Promise<any> {
  try { return await response.json(); } catch { return null; }
}

function errorMessage(data: any, status: number): string {
  return typeof data?.error === "string" ? data.error : `Request failed with status ${status}.`;
}

async function localRecords(): Promise<BoardingRecord[]> {
  const dogs = await k9Api.list();
  return readLocal().map((record) => mapRow(record, dogs)).sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));
}

export const boardingApi = {
  async list(): Promise<BoardingRecord[]> {
    let response: Response;
    try { response = await fetch("/api/boarding"); } catch { return localRecords(); }
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) return localRecords();
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    const dogs = await k9Api.list();
    return (data?.data ?? []).map((row: any) => mapRow(row, dogs));
  },
  async get(id: string): Promise<BoardingRecord | null> {
    let response: Response;
    try { response = await fetch(`/api/boarding/${encodeURIComponent(id)}`); } catch {
      return (await localRecords()).find((record) => record.id === id) ?? null;
    }
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
      return (await localRecords()).find((record) => record.id === id) ?? null;
    }
    if (response.status === 404) return null;
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    return data?.data ? mapRow(data.data, await k9Api.list()) : null;
  },
  async create(values: BoardingFormValues): Promise<BoardingRecord> {
    let response: Response;
    try {
      response = await fetch("/api/boarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) });
    } catch { response = new Response(null); }
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
      const dogs = await k9Api.list();
      const dog = dogs.find((item) => item.id === values.k9Id);
      if (!dog) throw new Error("Register this dog in the K9 Roster first.");
      const now = new Date().toISOString();
      const record: StoredRecord = { ...values, id: uid(), createdAt: now, updatedAt: now };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...readLocal(), record]));
      return mapRow(record, dogs);
    }
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    return mapRow(data.data, await k9Api.list());
  },
  async update(id: string, values: BoardingFormValues): Promise<BoardingRecord> {
    let response: Response;
    try {
      response = await fetch(`/api/boarding/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(values)) });
    } catch { response = new Response(null); }
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
      const dogs = await k9Api.list();
      if (!dogs.some((item) => item.id === values.k9Id)) throw new Error("Register this dog in the K9 Roster first.");
      let updated: StoredRecord | undefined;
      const records = readLocal().map((item) => item.id === id ? (updated = { ...item, ...values, updatedAt: new Date().toISOString() }) : item);
      if (!updated) throw new Error("Boarding record not found.");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return mapRow(updated, dogs);
    }
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(errorMessage(data, response.status));
    return mapRow(data.data, await k9Api.list());
  },
  async remove(id: string): Promise<void> {
    let response: Response;
    try { response = await fetch(`/api/boarding/${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { response = new Response(null); }
    if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readLocal().filter((record) => record.id !== id)));
      return;
    }
    if (!response.ok) throw new Error(errorMessage(await jsonResponse(response), response.status));
  },
};