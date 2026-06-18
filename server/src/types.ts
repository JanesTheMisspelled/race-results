export type ResultType = "time" | "distance";

export interface RaceType {
  id: number;
  name: string;
  discipline_fields: string[];
  result_type: ResultType;
}

export interface Race {
  id: number;
  name: string;
  race_type_id: number;
  location: string;
  race_type_name?: string;
  discipline_fields?: string[];
  result_type?: ResultType;
}

export interface RaceResult {
  id: number;
  race_id: number;
  year: number;
  total_time: number;
  distance: number;
  discipline_data: Record<string, number>;
  additional_info: Record<string, string>;
  notes: string;
  organizer_changed: boolean;
  created_at: string;
  updated_at: string;
  race_name?: string;
  location?: string;
  race_type_id?: number;
  race_type_name?: string;
  discipline_fields?: string[];
  result_type?: ResultType;
}

export interface CreateRaceType {
  name: string;
  discipline_fields: string[];
  result_type?: ResultType;
}

export interface UpdateRaceType {
  name?: string;
  discipline_fields?: string[];
  result_type?: ResultType;
}

export interface CreateRace {
  name: string;
  race_type_id: number;
  location: string;
}

export interface UpdateRace {
  name?: string;
  race_type_id?: number;
  location?: string;
}

export interface CreateRaceResult {
  race_id: number;
  year: number;
  total_time?: number;
  distance?: number;
  discipline_data?: Record<string, number>;
  additional_info?: Record<string, string>;
  notes?: string;
  organizer_changed?: boolean;
}

export interface UpdateRaceResult {
  race_id?: number;
  year?: number;
  total_time?: number;
  distance?: number;
  discipline_data?: Record<string, number>;
  additional_info?: Record<string, string>;
  notes?: string;
  organizer_changed?: boolean;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number];

export interface RaceImage {
  id: number;
  result_id: number;
  filename: string;
  mime_type: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  thumbnail?: string;
}

export interface CreateRaceImage {
  filename: string;
  mime_type: string;
  data: string;
  caption?: string;
}

export interface UpdateRaceImage {
  caption?: string;
  sort_order?: number;
}
