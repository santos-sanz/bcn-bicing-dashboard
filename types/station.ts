export interface Station {
  station_id: string;
  name: string;
  physical_configuration?: string;
  lat: number;
  lon: number;
  altitude?: number;
  address?: string;
  cross_street?: string;
  post_code?: string;
  capacity: number;
  is_charging_station?: boolean;
  rental_methods?: string[];
  groups?: string[];
  obcn?: string;
  short_name?: string;
  nearby_distance?: number;
  _ride_code_support?: boolean;
  rental_uris?: any;
  num_bikes_available: number;
  num_bikes_available_types: {
    mechanical: number;
    ebike: number;
  };
  num_bikes_disabled: number;
  num_docks_available: number;
  num_docks_disabled: number;
  last_reported: number;
  status: string;
  is_installed?: number;
  is_renting?: number;
  is_returning?: number;
  traffic?: any;
  suburb?: string;
  district?: string;
  routeColor?: string;
}