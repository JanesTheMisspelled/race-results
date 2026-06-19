export type ResultType = "time" | "distance" | "laps";

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
  laps: number;
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
  is_shadow?: boolean;
  shadow_discipline?: string;
  shadow_parent_result_id?: number;
  shadow_source_race_type_id?: number;
  shadow_source_race_type_name?: string;
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

export interface RaceTypeShadow {
  id: number;
  source_race_type_id: number;
  discipline_field: string;
  target_race_type_id: number;
  created_at: string;
  target_race_type_name?: string;
  target_result_type?: ResultType;
}
