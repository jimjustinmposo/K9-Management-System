export type K9Sex = "Male" | "Female";

export type K9Status =
  | "Active"
  | "In Training"
  | "Retired"
  | "Deceased"
  | "Medical Hold";

export interface K9Record {
  id: string;
  profilePhoto: string;
  dogName: string;
  nickName: string;
  breed: string;
  dateOfBirth: string;
  sex: K9Sex | "";
  status: K9Status | "";
  microchipNumber: string;
  fatherSire: string;
  motherDam: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type K9FormValues = Omit<K9Record, "id" | "createdAt" | "updatedAt">;

export const K9_SEX_OPTIONS: K9Sex[] = ["Male", "Female"];

export const K9_STATUS_OPTIONS: K9Status[] = [
  "Active",
  "In Training",
  "Medical Hold",
  "Retired",
  "Deceased",
];

export const K9_BREED_OPTIONS = [
  "Belgian Malinois",
  "German Shepherd",
  "Dutch Shepherd",
  "Labrador Retriever",
  "Bloodhound",
  "Beagle",
  "Springer Spaniel",
  "Rottweiler",
  "Other",
];

export const EMPTY_K9_FORM: K9FormValues = {
  profilePhoto: "",
  dogName: "",
  nickName: "",
  breed: "",
  dateOfBirth: "",
  sex: "",
  status: "",
  microchipNumber: "",
  fatherSire: "",
  motherDam: "",
  notes: "",
};

export function k9Initials(name: string): string {
  const clean = name.trim();
  if (!clean) return "K9";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function k9Age(dateOfBirth: string): string {
  if (!dateOfBirth) return "—";
  const born = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(born.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "—";
  if (years === 0) return `${months} mo`;
  return months === 0 ? `${years} yr` : `${years}y ${months}m`;
}
