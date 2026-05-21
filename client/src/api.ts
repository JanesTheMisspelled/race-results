import axios from "axios";
import type { RaceType, Race, RaceResult } from "./types";

const api = axios.create({ baseURL: "/api" });

export const getRaceTypes = () => api.get<RaceType[]>("/race-types").then((r) => r.data);
export const getRaceType = (id: number) => api.get<RaceType>(`/race-types/${id}`).then((r) => r.data);
export const createRaceType = (data: Omit<RaceType, "id">) => api.post<RaceType>("/race-types", data).then((r) => r.data);
export const updateRaceType = (id: number, data: Partial<RaceType>) => api.put<RaceType>(`/race-types/${id}`, data).then((r) => r.data);
export const deleteRaceType = (id: number) => api.delete(`/race-types/${id}`);

export const getRaces = () => api.get<Race[]>("/races").then((r) => r.data);
export const getRace = (id: number) => api.get<Race>(`/races/${id}`).then((r) => r.data);
export const createRace = (data: Omit<Race, "id" | "race_type_name" | "discipline_fields">) => api.post<Race>("/races", data).then((r) => r.data);
export const updateRace = (id: number, data: Partial<Race>) => api.put<Race>(`/races/${id}`, data).then((r) => r.data);
export const deleteRace = (id: number) => api.delete(`/races/${id}`);

export const getResults = (raceId?: number) =>
  api.get<RaceResult[]>("/results", { params: raceId ? { race_id: raceId } : undefined }).then((r) => r.data);
export const getResult = (id: number) => api.get<RaceResult>(`/results/${id}`).then((r) => r.data);
export const createResult = (data: {
  race_id: number;
  year: number;
  total_time?: number;
  distance?: number;
  discipline_data: Record<string, number>;
  additional_info: Record<string, string>;
  notes?: string;
}) => api.post<RaceResult>("/results", data).then((r) => r.data);
export const updateResult = (id: number, data: Partial<RaceResult>) => api.put<RaceResult>(`/results/${id}`, data).then((r) => r.data);
export const deleteResult = (id: number) => api.delete(`/results/${id}`);

export const getRaceResults = (raceId: number) => api.get<RaceResult[]>(`/races/${raceId}/results`).then((r) => r.data);

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(timeStr, 10) || 0;
}

export function formatResult(result: RaceResult): string {
  if (result.result_type === "distance") {
    return result.distance > 0 ? `${result.distance.toFixed(2)} km` : "-";
  }
  return formatTime(result.total_time);
}
