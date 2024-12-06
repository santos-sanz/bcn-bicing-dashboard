"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { hasAccess } from '@/config/accessRules'
import { supabase } from '@/lib/supabase'
import { Station } from '@/types/station'
import { Map as LeafletMap } from 'leaflet'
import axios from 'axios'
import { MapPin as MapIcon } from 'lucide-react'
import { Bike } from 'lucide-react'
import { LockKeyhole as Lock } from 'lucide-react'
import { AutocompleteSearch } from '@/components/AutocompleteSearch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from 'next/dynamic'
import { DefaultMapControls } from '@/components/complex/DefaultMapControls'
import { HeatMapControls } from '@/components/complex/HeatMapControls'
import { StatusMapControls } from '@/components/complex/StatusMapControls'
import { format } from 'date-fns'
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/DataTable"

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T]) => React.ReactNode;
}

interface StationStats {
  station_id: string;
  average_bikes_available: number;
  average_docks_available: number;
  pct_time_zero_bikes: number;
  pct_time_zero_docks: number;
  time_zero_bikes_percentile: number;
  time_zero_docks_percentile: number;
  events: number;
  use_in: number;
  use_out: number;
  use_in_per_day: number;
  use_out_per_day: number;
  events_per_day: number;
  capacity: number;
  events_percentile: number;
  use_in_per_day_capacity: number;
  use_out_per_day_capacity: number;
  events_per_day_capacity: number;
  station_info: {
    station_id: string;
    name: string;
    lon: number;
    lat: number;
    district: string;
    suburb: string;
    post_code: string;
  };
}

const MapComponent = dynamic(() => import('@/components/AnalyticsMapComponent'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
})

export default function AnalyticsPage() {
  const getCurrentFormattedDate = () => {
    const now = new Date()
    return now.getFullYear() +
      '-' + String(now.getMonth() + 1).padStart(2, '0') +
      '-' + String(now.getDate()).padStart(2, '0') +
      ' ' + String(now.getHours()).padStart(2, '0') +
      ':' + String(now.getMinutes()).padStart(2, '0') +
      ':' + String(now.getSeconds()).padStart(2, '0')
  }

  const [usageData, setUsageData] = useState([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('city')
  const [filterValue, setFilterValue] = useState<string>('')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [metrics, setMetrics] = useState({
    stations: 0,
    availableBikes: 0,
    availableDocks: 0,
    disabledDocks: 0,
    disabledBikes: 0,
    disabledStations: 0
  })
  const [bikeStations, setBikeStations] = useState<Station[]>([])
  const [isHeatMap, setIsHeatMap] = useState(false)
  const [heatMapMode, setHeatMapMode] = useState('all')
  const [mapMode, setMapMode] = useState('default')
  const router = useRouter()
  const [getMarkerColor, setGetMarkerColor] = useState<(station: Station) => string>(() => '#3b82f6')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [tempFromDate, setTempFromDate] = useState<string>('2023-01-01 00:00:00')
  const [tempToDate, setTempToDate] = useState<string>(getCurrentFormattedDate())
  const [stationStats, setStationStats] = useState<Array<StationStats>>([])
  const [filteredStats, setFilteredStats] = useState<Array<StationStats>>([])

  // Add color mapping for districts and suburbs
  const districtColors: { [key: string]: string } = {
    'Ciutat Vella': '#ef4444',      // Red
    'Eixample': '#f97316',          // Orange
    'Sants-Montjuïc': '#f59e0b',    // Amber
    'Les Corts': '#84cc16',         // Lime
    'Sarrià-Sant Gervasi': '#22c55e', // Green
    'Gràcia': '#14b8a6',            // Teal
    'Horta-Guinardó': '#06b6d4',    // Cyan
    'Nou Barris': '#3b82f6',        // Blue
    'Sant Andreu': '#6366f1',       // Indigo
    'Sant Martí': '#a855f7'         // Purple
  };

  const getStationColor = useCallback((station: Station): string => {
    if (!station || !stationStats.length) return '#3b82f6' // Default blue color

    const statData = stationStats.find(stat => 
      stat?.station_info?.station_id === station?.station_id
    );
    
    if (!statData) return '#3b82f6' // Default blue color

    // Heat map coloring logic
    if (isHeatMap) {
      // Get the value to visualize based on heatMapMode
      let value = 0;
      let maxValue = 0;

      // Find max value for normalization
      stationStats.forEach(stat => {
        let currentValue = 0;
        switch (heatMapMode) {
          case 'all-absolute':
            currentValue = stat.events || 0;
            break;
          case 'in-absolute':
            currentValue = stat.use_in || 0;
            break;
          case 'out-absolute':
            currentValue = stat.use_out || 0;
            break;
          case 'all-relative':
            currentValue = stat.events_per_day_capacity || 0;
            break;
          case 'in-relative':
            currentValue = stat.use_in_per_day_capacity || 0;
            break;
          case 'out-relative':
            currentValue = stat.use_out_per_day_capacity || 0;
            break;
          case 'all-percentile':
          case 'in-percentile':
          case 'out-percentile':
            currentValue = stat.events_percentile || 0;
            break;
        }
        maxValue = Math.max(maxValue, currentValue);
      });

      // Get value for current station
      switch (heatMapMode) {
        case 'all-absolute':
          value = statData.events || 0;
          break;
        case 'in-absolute':
          value = statData.use_in || 0;
          break;
        case 'out-absolute':
          value = statData.use_out || 0;
          break;
        case 'all-relative':
          value = statData.events_per_day_capacity || 0;
          break;
        case 'in-relative':
          value = statData.use_in_per_day_capacity || 0;
          break;
        case 'out-relative':
          value = statData.use_out_per_day_capacity || 0;
          break;
        case 'all-percentile':
        case 'in-percentile':
        case 'out-percentile':
          value = statData.events_percentile || 0;
          maxValue = 1; // Percentile is already normalized between 0 and 1
          break;
      }

      // Normalize value (0 to 1)
      const normalizedValue = maxValue > 0 ? value / maxValue : 0;

      // For percentile mode, invert the color scale (0% = green, 100% = red)
      if (heatMapMode.endsWith('-percentile')) {
        const hue = 120 * (1 - normalizedValue); // 120 is green, 0 is red
        return `hsl(${hue}, 85%, 50%)`;
      }

      // Convert to HSL color (120 is green, 0 is red)
      const hue = 120 * (1 - normalizedValue);
      return `hsl(${hue}, 85%, 50%)`;
    }

    // Status map coloring logic
    if (filter.includes('-time') || filter.includes('-percentile')) {
      let value = 0;
      const isEmptyFilter = filter.startsWith('empty');

      if (filter.includes('-time')) {
        value = isEmptyFilter ? statData.pct_time_zero_bikes : statData.pct_time_zero_docks;
        // Convertir a porcentaje para comparar con los umbrales
        const percentage = value * 100;
        
        if (percentage > 20) {
          return '#ef4444'; // rojo
        } else if (percentage > 10) {
          return '#f97316'; // naranja
        } else if (percentage > 5) {
          return '#facc15'; // amarillo
        } else if (percentage > 2) {
          return '#84cc16'; // verde amarillento
        }
        return '#22c55e'; // verde por defecto (menos de 2%)
      } else { // percentile mode
        value = isEmptyFilter ? 
          statData.time_zero_bikes_percentile : 
          statData.time_zero_docks_percentile;
          
        // For percentile mode, red means high value (bad), green means low value (good)
        const hue = 120 * (1 - value);
        return `hsl(${hue}, 85%, 50%)`;
      }
    }

    // Default coloring logic
    switch (filter) {
      case 'city':
        return '#3b82f6'; // Default blue for city view
      case 'district':
        return districtColors[statData.station_info.district] || '#3b82f6';
      case 'suburb':
      case 'postcode': {
        let value: string;
        if (filter === 'suburb') {
          value = statData.station_info.suburb;
        } else {
          const postcode = statData.station_info.post_code;
          value = postcode.slice(-2);
          
          const num = parseInt(value, 10);
          const hue = Math.floor((num / 100) * 360);
          const saturation = num % 2 === 0 ? 70 : 80;
          const lightness = num % 2 === 0 ? 45 : 55;
          
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        }
        
        const hash = value.split('').reduce((acc: number, char: string) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);

        const hue = Math.abs(hash % 360);
        const saturation = 65 + (hash % 20);
        const lightness = 45 + ((hash >> 4) % 15);
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      }
      default:
        return '#3b82f6'; // Default blue color
    }
  }, [filter, isHeatMap, heatMapMode, stationStats]);

  const updateMetrics = useCallback((stations: Station[]) => {
    if (!stations || stations.length === 0) {
      setMetrics({
        stations: 0,
        availableBikes: 0,
        availableDocks: 0,
        disabledDocks: 0,
        disabledBikes: 0,
        disabledStations: 0
      });
      return;
    }

    const totalStations = stations.length;
    const availableBikes = stations.reduce((sum, station) => sum + (station.num_bikes_available || 0), 0);
    const availableDocks = stations.reduce((sum, station) => sum + (station.num_docks_available || 0), 0);
    const disabledDocks = stations.reduce((sum, station) => sum + (station.num_docks_disabled || 0), 0);
    const disabledBikes = stations.reduce((sum, station) => sum + (station.num_bikes_disabled || 0), 0);
    const disabledStationsCount = stations.filter(station => station.status !== 'IN_SERVICE').length;

    setMetrics({
      stations: totalStations,
      availableBikes,
      availableDocks,
      disabledDocks,
      disabledBikes,
      disabledStations: disabledStationsCount
    });
  }, []);

  const isValidTimestamp = (timestamp: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
    if (!regex.test(timestamp)) return false
    
    const date = new Date(timestamp.replace(' ', 'T'))
    return !isNaN(date.getTime())
  }

  const handleFromDateChange = (value: string) => {
    setTempFromDate(value)
  }

  const handleToDateChange = (value: string) => {
    setTempToDate(value)
  }

  const handleApplyDates = () => {
    if (
      (!tempFromDate || isValidTimestamp(tempFromDate)) && 
      (!tempToDate || isValidTimestamp(tempToDate))
    ) {
      setFromDate(tempFromDate)
      setToDate(tempToDate)
    }
  }

  const refreshData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      
      if (fromDate && isValidTimestamp(fromDate)) {
        const fromTimestamp = new Date(fromDate.replace(' ', 'T')).toISOString()
        params.append('from', fromTimestamp)
      }
      if (toDate && isValidTimestamp(toDate)) {
        const toTimestamp = new Date(toDate.replace(' ', 'T')).toISOString()
        params.append('to', toTimestamp)
      }
      
      const timestamp = new Date().getTime()
      params.append('t', timestamp.toString())
      
      const response = await axios.get(`/api/bikesystem?${params.toString()}`)
      const stations = response.data
      setBikeStations(stations)
    } catch (error) {
      console.error('Error fetching Bicing data:', error)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    if (fromDate || toDate) {
      refreshData();
    }
  }, [fromDate, toDate, refreshData]);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!hasAccess(user?.email)) {
        router.push('/')
      }
    }

    checkAccess()
    fetch('/data/flow.json')
      .then(response => response.json())
      .then(data => setUsageData(data))
  }, [router])

  useEffect(() => {
    const fetchBicingData = async () => {
      try {
        const response = await fetch('/data/stats.json')
        const statsData = await response.json()
        
        // Transform stats data into Station format
        const stations: Station[] = statsData
          .filter((stat: any) => stat && stat.station_info)
          .map((stat: any) => ({
            station_id: stat.station_info.station_id,
            name: stat.station_info.name,
            lat: stat.station_info.lat,
            lon: stat.station_info.lon,
            district: stat.station_info.district,
            suburb: stat.station_info.suburb,
            post_code: stat.station_info.post_code,
            capacity: stat.capacity,
            num_bikes_available: stat.average_bikes_available,
            num_bikes_disabled: 0,
            num_docks_available: stat.average_docks_available,
            num_docks_disabled: 0,
            last_reported: new Date().toISOString(),
            status: 'IN_SERVICE'
          }));

        console.log('Transformed stations:', stations.length);
        if (stations.length > 0) {
          console.log('Sample transformed station:', stations[0]);
        }

        setBikeStations(stations);
        setFilteredStations(stations);
        updateMetrics(stations);
      } catch (error) {
        console.error('Error fetching Bicing data:', error);
      }
    };

    fetchBicingData()
  }, [updateMetrics])

  useEffect(() => {
    if (map && typeof map.setView === 'function') {
      try {
        map.setView([41.3874, 2.1686], 13)
      } catch (error) {
        console.error('Error setting initial map view:', error)
      }
    }
  }, [map])

  useEffect(() => {
    if (!bikeStations.length || !stationStats.length) return;
    
    let filtered = bikeStations;
    let filteredStats = stationStats;

    // First apply map filters
    if (filter !== 'district' && filter !== 'station') {
      filtered = bikeStations.filter(station => {
        switch (filter) {
          case 'EMPTY':
            return station.num_bikes_available === 0 && station.status === 'IN_SERVICE';
          case 'FULL':
            return station.num_docks_available === 0 && station.status === 'IN_SERVICE';
          case 'AVAILABLE':
            return station.num_bikes_available > 0 && station.num_docks_available > 0 && station.status === 'IN_SERVICE';
          case 'OTHER':
            return station.status !== 'IN_SERVICE';
          default:
            return true;
        }
      });

      // Filter stats based on filtered stations
      const filteredStationIds = filtered.map(station => station.station_id);
      filteredStats = stationStats.filter(stat => 
        filteredStationIds.includes(stat.station_info?.station_id || '')
      );
    }

    setFilteredStations(filtered);
    setFilteredStats(filteredStats);
    updateMetrics(filtered);
  }, [filter, bikeStations, stationStats, updateMetrics]);

  useEffect(() => {
    // Load stats.json data
    const loadStatsData = async () => {
      try {
        const response = await fetch('/data/stats.json');
        const data = await response.json();
        const validData = data.filter((stat: any) => stat && stat.station_info);
        setStationStats(validData);
        setFilteredStats(validData);
        
        const stationsData: Station[] = validData
          .filter((stat: any) => stat.station_info && stat.station_info.station_id)
          .map((stat: any) => ({
            station_id: stat.station_info.station_id,
            name: stat.station_info.name,
            lat: stat.station_info.lat,
            lon: stat.station_info.lon,
            district: stat.station_info.district,
            suburb: stat.station_info.suburb,
            post_code: stat.station_info.post_code,
            capacity: stat.capacity,
            num_bikes_available: stat.average_bikes_available,
            num_bikes_disabled: 0,
            num_docks_available: stat.average_docks_available,
            num_docks_disabled: 0,
            last_reported: new Date().toISOString(),
            status: 'IN_SERVICE'
          }));
        
        updateMetrics(stationsData);
      } catch (error) {
        console.error('Error loading stats data:', error);
        setStationStats([]);
        setFilteredStats([]);
      }
    };

    loadStatsData();
  }, [updateMetrics]);

  // Update isHeatMap when mapMode changes
  useEffect(() => {
    setIsHeatMap(mapMode === 'heatmap');
  }, [mapMode]);

  // Add default coordinates constant
  const DEFAULT_COORDINATES = {
    lat: 41.3874,
    lng: 2.1686,
    zoom: 13
  } as const;

  useEffect(() => {
    if (!map || typeof map.setView !== 'function') return;

    try {
      map.setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], DEFAULT_COORDINATES.zoom);
    } catch (error) {
      console.error('Error setting initial map view:', error);
    }
  }, [map]);

  // Update resetToDefaultView to use the constant
  const resetToDefaultView = () => {
    setFilteredStats(stationStats);
    setSelectedStation(null);
    setFilter('city');
    setFilterValue('');
    if (map && typeof map.setView === 'function') {
      try {
        map.setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], DEFAULT_COORDINATES.zoom);
      } catch (error) {
        console.error('Error resetting map view:', error);
      }
    }
  };

  // Update handleStationSelect
  const handleStationSelect = (station: Station | null) => {
    if (!station) {
      resetToDefaultView();
      return;
    }

    // Ensure we have valid coordinates before proceeding
    const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
    const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
    
    // Validate coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      console.warn('Invalid coordinates for station:', station);
      resetToDefaultView();
      return;
    }

    // Filter stats by station ID
    const filtered = stationStats.filter(stat => 
      stat.station_info?.station_id === station.station_id
    );
    setFilteredStats(filtered);
    setSelectedStation(station);
    setFilter('station');
    setFilterValue(station.name);
    
    if (map && typeof map.setView === 'function') {
      try {
        map.setView([lat, lon], 15);
      } catch (error) {
        console.error('Error setting map view:', error);
        resetToDefaultView();
      }
    }
  };

  // Update handleDistrictFilter
  const handleDistrictFilter = (district: string) => {
    if (!district) {
      resetToDefaultView();
      return;
    }

    // Filter stats by district
    const filtered = stationStats.filter(stat => 
      stat.station_info?.district === district
    );
    setFilteredStats(filtered);
    setFilter('district');
    setFilterValue(district);

    // Calculate center of the district based on filtered stats
    if (filtered.length > 0) {
      const validStations = filtered.filter(stat => 
        stat.station_info &&
        typeof stat.station_info.lat === 'number' && 
        typeof stat.station_info.lon === 'number' &&
        !isNaN(stat.station_info.lat) && 
        !isNaN(stat.station_info.lon) &&
        stat.station_info.lat !== 0 &&
        stat.station_info.lon !== 0
      );

      if (validStations.length > 0) {
        const sumLat = validStations.reduce((sum, stat) => 
          sum + stat.station_info.lat, 0
        );
        const sumLon = validStations.reduce((sum, stat) => 
          sum + stat.station_info.lon, 0
        );
        const centerLat = sumLat / validStations.length;
        const centerLon = sumLon / validStations.length;

        if (map && typeof map.setView === 'function' && 
            !isNaN(centerLat) && !isNaN(centerLon) && 
            centerLat !== 0 && centerLon !== 0) {
          try {
            map.setView([centerLat, centerLon], 14);
          } catch (error) {
            console.error('Error setting map view:', error);
            resetToDefaultView();
          }
        } else {
          console.warn('Invalid center coordinates calculated for district:', district);
          resetToDefaultView();
        }
      } else {
        console.warn('No valid coordinates found for district:', district);
        resetToDefaultView();
      }
    } else {
      resetToDefaultView();
    }

    // Update filtered stations for the map
    const filteredMapStations = bikeStations.filter(station => {
      const statData = stationStats.find(stat => 
        stat.station_info?.station_id === station.station_id
      );
      return statData?.station_info?.district === district;
    });
    setFilteredStations(filteredMapStations);
  };

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="label font-semibold text-gray-800">{`Time: ${label}`}</p>
          <p className="intro text-blue-600">{`Bikes In: ${payload[0].value.toFixed(2)}`}</p>
          <p className="intro text-red-600">{`Bikes Out: ${payload[1].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Define the type for summary data
  interface SummaryData {
    location: string;
    total: number;
    events_per_day: number;
    bikes_in_per_day: number;
    bikes_out_per_day: number;
    avg_bikes: number;
    avg_docks: number;
    pct_time_empty: number;
    pct_time_full: number;
  }

  // Helper function to get current filter name
  const getCurrentFilterName = () => {
    if (filter === 'city') return 'All Barcelona'
    if (filter === 'district' && filterValue) return `District: ${filterValue}`
    if (filter === 'station' && selectedStation) return `Station: ${selectedStation.name}`
    return 'Unknown'
  }

  // Original columns for real-time station data
  const stationColumns: Column<Station>[] = [
    {
      key: 'name',
      header: 'Station'
    },
    {
      key: 'capacity',
      header: 'Capacity'
    },
    {
      key: 'num_bikes_available',
      header: 'Available Bikes',
      render: (value) => {
        const numValue = value as number;
        return (
          <span>
            {numValue || 0}
          </span>
        );
      }
    },
    {
      key: 'num_docks_available',
      header: 'Available Docks',
      render: (value) => {
        const numValue = value as number;
        return (
          <span className={numValue === 0 ? 'text-red-500' : 'text-green-500'}>
            {numValue || 0}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status'
    }
  ];

  // Stats columns for historical data
  const statsColumns: Column<StationStats>[] = [
    {
      key: 'station_info',
      header: 'Station Name',
      render: (value) => {
        const info = value as StationStats['station_info'];
        return info.name;
      }
    },
    {
      key: 'station_info',
      header: 'District',
      render: (value) => {
        const info = value as StationStats['station_info'];
        return info.district;
      }
    },
    {
      key: 'station_info',
      header: 'Suburb',
      render: (value) => {
        const info = value as StationStats['station_info'];
        return info.suburb;
      }
    },
    {
      key: 'capacity',
      header: 'Capacity'
    },
    {
      key: 'average_bikes_available',
      header: 'Avg. Bikes Available',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'average_docks_available',
      header: 'Avg. Docks Available',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'pct_time_zero_bikes',
      header: 'Time Empty (%)',
      render: (value) => {
        const numValue = value as number;
        return (numValue * 100).toFixed(2) + '%';
      }
    },
    {
      key: 'pct_time_zero_docks',
      header: 'Time Full (%)',
      render: (value) => {
        const numValue = value as number;
        return (numValue * 100).toFixed(2) + '%';
      }
    },
    {
      key: 'events',
      header: 'Total Events'
    },
    {
      key: 'use_in',
      header: 'Total Bikes In'
    },
    {
      key: 'use_out',
      header: 'Total Bikes Out'
    },
    {
      key: 'use_in_per_day',
      header: 'Bikes In/Day',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'use_out_per_day',
      header: 'Bikes Out/Day',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'events_per_day',
      header: 'Events/Day',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'use_in_per_day_capacity',
      header: 'Bikes In/Day/Capacity',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'use_out_per_day_capacity',
      header: 'Bikes Out/Day/Capacity',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'events_per_day_capacity',
      header: 'Events/Day/Capacity',
      render: (value) => {
        const numValue = value as number;
        return numValue.toFixed(2);
      }
    },
    {
      key: 'events_percentile',
      header: 'Events Percentile',
      render: (value) => {
        const numValue = value as number;
        return (numValue * 100).toFixed(2) + '%';
      }
    }
  ];

  // Add a constant marker size
  const MARKER_SIZE = 10;

  // Set initial filter to 'city'
  useEffect(() => {
    setFilter('city');
  }, []); // Run only once on component mount

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Analytics</h1>
      
      <Card className="bg-white shadow-lg">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-2xl text-gray-800">Stations Map</CardTitle>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-gray-500 whitespace-nowrap">From:</span>
                  <Input
                    type="text"
                    placeholder="2023-01-01 00:00:00"
                    value={tempFromDate}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    className={`w-full sm:w-[200px] ${!isValidTimestamp(tempFromDate) && tempFromDate !== "" ? "border-red-500" : ""}`}
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-sm text-gray-500 whitespace-nowrap">To:</span>
                  <Input
                    type="text"
                    placeholder={getCurrentFormattedDate()}
                    value={tempToDate}
                    onChange={(e) => handleToDateChange(e.target.value)}
                    className={`w-full sm:w-[200px] ${!isValidTimestamp(tempToDate) && tempToDate !== "" ? "border-red-500" : ""}`}
                  />
                </div>
              </div>

              <button
                onClick={handleApplyDates}
                disabled={
                  (tempFromDate !== "" && !isValidTimestamp(tempFromDate)) ||
                  (tempToDate !== "" && !isValidTimestamp(tempToDate))
                }
                className={`px-4 py-2 rounded-md w-full sm:w-auto ${
                  (tempFromDate !== "" && !isValidTimestamp(tempFromDate)) ||
                  (tempToDate !== "" && !isValidTimestamp(tempToDate))
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Apply
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg overflow-hidden relative" style={{ zIndex: 1 }}>
            {filteredStations.length > 0 ? (
              <MapComponent
                stations={filteredStations}
                getMarkerColor={getStationColor}
                getMarkerSize={() => MARKER_SIZE}
                defaultCenter={[41.3874, 2.1686]}
                defaultZoom={13}
                heatMapMode={mapMode === 'status' ? filter : heatMapMode}
                getMetricValue={(station) => {
                  const statData = stationStats.find(stat => 
                    stat?.station_info?.station_id === station?.station_id
                  );
                  
                  if (!statData) return 0;
                  
                  // Si estamos en modo status, usamos el filtro actual
                  if (mapMode === 'status') {
                    switch (filter) {
                      case 'empty-time':
                        return statData.pct_time_zero_bikes || 0;
                      case 'full-time':
                        return statData.pct_time_zero_docks || 0;
                      case 'empty-percentile':
                        return statData.time_zero_bikes_percentile || 0;
                      case 'full-percentile':
                        return statData.time_zero_docks_percentile || 0;
                      default:
                        return 0;
                    }
                  }
                  
                  // Si no, usamos el modo de heat map
                  switch (heatMapMode) {
                    case 'all-absolute':
                      return statData.events || 0;
                    case 'in-absolute':
                      return statData.use_in || 0;
                    case 'out-absolute':
                      return statData.use_out || 0;
                    case 'all-relative':
                      return statData.events_per_day_capacity || 0;
                    case 'in-relative':
                      return statData.use_in_per_day_capacity || 0;
                    case 'out-relative':
                      return statData.use_out_per_day_capacity || 0;
                    case 'all-percentile':
                    case 'in-percentile':
                    case 'out-percentile':
                      return statData.events_percentile || 0;
                    default:
                      return 0;
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading stations data...</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Reorganization of controls in a column for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {/* Group 1: Default/Heat Map Buttons */}
              <div className="flex items-center justify-center sm:justify-start">
                <button 
                  className={`px-3 py-1 rounded-l-md ${mapMode === 'default' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  onClick={() => setMapMode('default')}
                >
                  Default
                </button>
                <button
                  className={`px-3 py-1 border-l border-white ${mapMode === 'heatmap' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} 
                  onClick={() => setMapMode('heatmap')}
                >
                  Heat Map
                </button>
                <button
                  className={`px-3 py-1 rounded-r-md border-l border-white ${mapMode === 'status' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} 
                  onClick={() => setMapMode('status')}
                >
                  Status
                </button>
              </div>

              {/* Group 2: Map Controls */}
              <div className="w-full">
                {mapMode === 'default' && (
                  <DefaultMapControls 
                    filter={filter}
                    setFilter={setFilter}
                    filteredStations={filteredStations}
                    setFilteredStations={setFilteredStations}
                    filterValue={filterValue}
                  />
                )}
                {mapMode === 'heatmap' && (
                  <HeatMapControls 
                    heatMapMode={heatMapMode}
                    setHeatMapMode={setHeatMapMode}
                    filteredStations={filteredStations}
                    setFilteredStations={setFilteredStations}
                  />
                )}
                {mapMode === 'status' && (
                  <StatusMapControls 
                    filter={filter}
                    setFilter={setFilter}
                    filteredStations={filteredStations}
                    setFilteredStations={setFilteredStations}
                    filterValue={filterValue}
                  />
                )}
              </div>

              {/* Group 3: Search */}
              <div className="flex justify-center sm:justify-end w-full">
                <AutocompleteSearch 
                  onSelect={handleStationSelect} 
                  bikeStations={bikeStations} 
                  setFilteredStations={setFilteredStations} 
                  updateMetrics={updateMetrics}
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

     
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Historical Station Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary table with averages of all metrics */}
            <DataTable 
              data={[{
                location: getCurrentFilterName(),
                total: filteredStats.length,
                events_per_day: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.events_per_day, 0) / filteredStats.length).toFixed(2)
                  : 0,
                bikes_in_per_day: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.use_in_per_day, 0) / filteredStats.length).toFixed(2)
                  : 0,
                bikes_out_per_day: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.use_out_per_day, 0) / filteredStats.length).toFixed(2)
                  : 0,
                avg_bikes: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.average_bikes_available, 0) / filteredStats.length).toFixed(2)
                  : 0,
                avg_docks: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.average_docks_available, 0) / filteredStats.length).toFixed(2)
                  : 0,
                pct_time_empty: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.pct_time_zero_bikes, 0) / filteredStats.length * 100).toFixed(2)
                  : 0,
                pct_time_full: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.pct_time_zero_docks, 0) / filteredStats.length * 100).toFixed(2)
                  : 0
              }]} 
              columns={[
                {
                  key: 'location',
                  header: 'Location'
                },
                {
                  key: 'total',
                  header: 'Total Stations'
                },
                {
                  key: 'events_per_day',
                  header: 'Avg Events/Day',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toFixed(2);
                  }
                },
                {
                  key: 'bikes_in_per_day',
                  header: 'Avg Bikes In/Day',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toFixed(2);
                  }
                },
                {
                  key: 'bikes_out_per_day',
                  header: 'Avg Bikes Out/Day',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toFixed(2);
                  }
                },
                {
                  key: 'avg_bikes',
                  header: 'Avg Bikes Available',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toFixed(2);
                  }
                },
                {
                  key: 'avg_docks',
                  header: 'Avg Docks Available',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toFixed(2);
                  }
                },
                {
                  key: 'pct_time_empty',
                  header: 'Time Empty (%)',
                  render: (value) => {
                    const numValue = value as number;
                    return `${numValue.toFixed(2)}%`;
                  }
                },
                {
                  key: 'pct_time_full',
                  header: 'Time Full (%)',
                  render: (value) => {
                    const numValue = value as number;
                    return `${numValue.toFixed(2)}%`;
                  }
                }
              ] as Column<SummaryData>[]}
              className="mb-8"
            />

            <DataTable 
              columns={statsColumns}
              data={filteredStats}
              className="mt-4"
            />
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">Usage Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={usageData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(value) => value} 
                  domain={['dataMin', 'dataMax']} 
                  ticks={Array.from({ length: 13 }, (_, i) => `${(i * 2).toString().padStart(2, '0')}:00`)} 
                  interval={0}
                  tick={{ fill: '#4a5568', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: '#4a5568', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  iconType="plainline"
                  iconSize={10}
                />
                <Line 
                  type="monotone" 
                  dataKey="in_bikes" 
                  name="Bikes In"
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 8 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="out_bikes" 
                  name="Bikes Out"
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
    


    </div>
  )
}