export type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  free_bikes: number;
  empty_slots: number;
  timestamp: string;
  extra: {
    online: boolean;
    uid: string;
    normal_bikes: number;
    ebikes: number;
    routeColor?: string;
  };
  action?: 'add' | 'remove';
  excessBikes?: number;
  deliveredBikes?: number;
  num_bikes_disabled: number;
  num_docks_disabled: number;
}; 