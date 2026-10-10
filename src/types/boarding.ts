import type { K9Record } from "./k9";

export type BoardingStatus = "Boarding" | "Checked Out";

export interface BoardingRecord {
  id: string;
  k9Id: string;
  ownerName: string;
  ownerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  status: BoardingStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  k9: Pick<K9Record, "id" | "dogName" | "nickName" | "breed" | "profilePhoto">;
}

export type BoardingFormValues = Omit<BoardingRecord, "id" | "createdAt" | "updatedAt" | "k9">;

export const EMPTY_BOARDING_FORM: BoardingFormValues = {
  k9Id: "",
  ownerName: "",
  ownerPhone: "",
  checkInDate: new Date().toISOString().slice(0, 10),
  checkOutDate: "",
  status: "Boarding",
  notes: "",
};

export const BOARDING_STATUS_OPTIONS: BoardingStatus[] = ["Boarding", "Checked Out"];

export function boardingDays(record: BoardingRecord): number {
  const start = new Date(`${record.checkInDate}T00:00:00`).getTime();
  const end = new Date(`${record.checkOutDate || new Date().toISOString().slice(0, 10)}T00:00:00`).getTime();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, Math.ceil((end - start) / 86400000) + 1) : 0;
}