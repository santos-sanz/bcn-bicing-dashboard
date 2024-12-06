export interface StationStats {
  station_id: string;
  average_bikes_available: number;
  average_docks_available: number;
  pct_time_zero_bikes: number;
  time_zero_bikes_percentile: number;
  pct_time_zero_docks: number;
  time_zero_docks_percentile: number;
  events: number;
  use_in: number;
  use_out: number;
  use_in_per_day: number;
  use_out_per_day: number;
  events_per_day: number;
  capacity: number;
  use_in_per_day_capacity: number;
  use_out_per_day_capacity: number;
  events_per_day_capacity: number;
  events_percentile: number;
  use_in_percentile: number;
  use_out_percentile: number;
  events_per_day_capacity_percentile: number;
  use_in_per_day_capacity_percentile: number;
  use_out_per_day_capacity_percentile: number;
  station_info: {
    station_id: string;
    name: string;
    lon: number;
    lat: number;
    post_code: string;
    district_id: string;
    district: string;
    suburb_id: string;
    suburb: string;
  };
}

export type StationsStats = StationStats[]; 