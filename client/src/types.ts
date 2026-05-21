export interface RaceType {
  id: number;
  name: string;
  discipline_fields: string[];
}

export interface Race {
  id: number;
  name: string;
  race_type_id: number;
  location: string;
  race_type_name?: string;
  discipline_fields?: string[];
}

export interface RaceResult {
  id: number;
  race_id: number;
  year: number;
  total_time: number;
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
}
