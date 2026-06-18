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
  created_at: string;
  updated_at: string;
  race_name?: string;
  location?: string;
  race_type_id?: number;
  race_type_name?: string;
  discipline_fields?: string[];
  result_type?: ResultType;
}

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
