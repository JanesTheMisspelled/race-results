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
}

export interface UpdateRaceResult {
  race_id?: number;
  year?: number;
  total_time?: number;
  distance?: number;
  discipline_data?: Record<string, number>;
  additional_info?: Record<string, string>;
  notes?: string;
}
