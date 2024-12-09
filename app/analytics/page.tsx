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
import { MapPin as MapIcon, Loader2 } from 'lucide-react'
import { Bike } from 'lucide-react'
import { LockKeyhole as Lock } from 'lucide-react'
import { AutocompleteSearch } from '@/components/AutocompleteSearch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from 'next/dynamic'
import { DefaultMapControls } from '@/components/complex/DefaultMapControls'
import { HeatMapControls } from '@/components/complex/HeatMapControls'
import { StatusMapControls } from '@/components/complex/StatusMapControls'
import { format, subDays, parseISO } from 'date-fns'
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
  const [searchFilteredStations, setSearchFilteredStations] = useState<Station[]>([])
  const [lastSearchFilter, setLastSearchFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [timeframeData, setTimeframeData] = useState<{
    from_date: string;
    to_date: string;
  }>({
    from_date: '',
    to_date: ''
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const handleApplyDates = async () => {
    if (
      (!tempFromDate || isValidTimestamp(tempFromDate)) && 
      (!tempToDate || isValidTimestamp(tempToDate))
    ) {
      setIsLoading(true);
      
      try {
        const params = new URLSearchParams({
          from_date: tempFromDate,
          to_date: tempToDate,
          model: 'city',
          station_code: 'city',
        });

        // First call stats API
        const statsResponse = await fetch(`/api/stats?${params.toString()}`);
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch stats data');
        }
        const statsData = await statsResponse.json();
        
        // Update stats data and derived state
        setStationStats(statsData);
        setFilteredStats(statsData);

        // Transform stats data into Station format and update map
        const stationsData: Station[] = statsData
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

        setBikeStations(stationsData);
        setFilteredStations(stationsData);
        updateMetrics(stationsData);

        // After stats is done, call flow API
        const flowResponse = await fetch(`/api/flow?${params.toString()}&output=both&aggregation_timeframe=1h`);
        if (!flowResponse.ok) {
          throw new Error('Failed to fetch flow data');
        }
        const flowData = await flowResponse.json();
        setUsageData(flowData);

        setFromDate(tempFromDate);
        setToDate(tempToDate);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
    const loadInitialData = async () => {
      try {
        // Check access first
        const { data: { user } } = await supabase.auth.getUser()
        if (!hasAccess(user?.email)) {
          router.push('/')
          return;
        }

        // Load timeframe data first
        const timeframeResponse = await fetch('/data/timeframe.json');
        const timeframe = await timeframeResponse.json();
        setTimeframeData(timeframe);
        
        // Set default dates when timeframe data loads
        const toDate = timeframe.to_date;
        const fromDate = format(
          subDays(parseISO(timeframe.to_date.replace(' ', 'T')), 1),
          'yyyy-MM-dd HH:mm:ss'
        );
        
        setTempFromDate(fromDate);
        setTempToDate(toDate);
        setFromDate(fromDate);
        setToDate(toDate);

        // Load initial flow data from file
        const timestamp = new Date().getTime();
        const flowResponse = await fetch(`/data/flow.json?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const flowData = await flowResponse.json();
        setUsageData(flowData);

        // Load initial stats data from file
        const statsResponse = await fetch(`/data/stats.json?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const statsData = await statsResponse.json();
        const validData = statsData.filter((stat: any) => stat && stat.station_info);
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
        
        setBikeStations(stationsData);
        setFilteredStations(stationsData);
        updateMetrics(stationsData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [updateMetrics]);

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
    if (filterValue && !filter.includes('-')) {
      setLastSearchFilter(filterValue)
      let filtered = bikeStations
      if (filter === 'station') {
        filtered = bikeStations.filter(station => 
          station.name.toLowerCase().includes(filterValue.toLowerCase())
        )
      } else if (filter === 'district') {
        filtered = bikeStations.filter(station => {
          const statData = stationStats.find(stat => 
            stat.station_info?.station_id === station.station_id
          )
          return statData?.station_info?.district === filterValue
        })
      }
      // Store the filtered stations
      setSearchFilteredStations(filtered)
      // Update the current view
      setFilteredStations(filtered)
    }
  }, [filterValue, filter, bikeStations, stationStats])

  useEffect(() => {
    // Load stats.json data
    const loadStatsData = async () => {
      try {
        const timestamp = new Date().getTime()
        const response = await fetch(`/data/stats.json?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
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
      // Reset to all stations
      setSearchFilteredStations([])
      setSelectedStation(null)
      setFilter('city')
      setFilterValue('')
      
      if (map && typeof map.setView === 'function') {
        try {
          map.setView([DEFAULT_COORDINATES.lat, DEFAULT_COORDINATES.lng], DEFAULT_COORDINATES.zoom)
        } catch (error) {
          console.error('Error resetting map view:', error)
        }
      }
      return
    }

    // Filter stations by name
    const filtered = bikeStations.filter(s => 
      s.name.toLowerCase().includes(station.name.toLowerCase())
    )
    
    setSearchFilteredStations(filtered)
    setFilteredStations(filtered)
    setSelectedStation(station)
    setFilter('station')
    setFilterValue(station.name)

    // Update map view
    const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat
    const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon
    
    if (map && typeof map.setView === 'function' && lat && lon) {
      try {
        map.setView([lat, lon], 15)
      } catch (error) {
        console.error('Error setting map view:', error)
      }
    }
  }

  // Modify the useEffect that handles filtering to preserve filtered stations
  useEffect(() => {
    // Only update filtered stations if we're not in the middle of a district/search filter
    if (!filterValue) {
      setFilteredStations(bikeStations)
    }
  }, [bikeStations])

  // Update the effect that handles filter value changes
  useEffect(() => {
    if (filterValue && !filter.includes('-')) {
      let filtered = bikeStations
      if (filter === 'station') {
        filtered = bikeStations.filter(station => 
          station.name.toLowerCase().includes(filterValue.toLowerCase())
        )
      } else if (filter === 'district') {
        filtered = bikeStations.filter(station => station.district === filterValue)
      } else if (filter === 'suburb') {
        filtered = bikeStations.filter(station => station.suburb === filterValue)
      } else if (filter === 'postcode') {
        filtered = bikeStations.filter(station => station.post_code === filterValue)
      }
      setFilteredStations(filtered)
    }
  }, [filterValue, filter, bikeStations])

  // Update handleDistrictFilter
  const handleDistrictFilter = (district: string) => {
    console.log('handleDistrictFilter called with:', district);
    
    if (!district) {
      resetToDefaultView();
      return;
    }

    setFilter('district');
    setFilterValue(district);

    // Filter stats by district
    const filtered = stationStats.filter(stat => 
      stat.station_info?.district === district
    );
    setFilteredStats(filtered);

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
    avg_capacity: number;
    avg_bikes: number;
    avg_docks: number;
    pct_time_empty: number;
    pct_time_full: number;
    total_events: number;
    total_bikes_in: number;
    total_bikes_out: number;
  }

  // Helper function to get current filter name
  const getCurrentFilterName = () => {
    if (filter === 'city') return 'Barcelona'
    if (filter === 'district' && filterValue) return `District: ${filterValue}`
    if (filter === 'station' && selectedStation) return `Station: ${selectedStation.name}`
    if (filter == 'postcode' && filterValue) return `Postcode: ${filterValue}`
    return 'Barcelona'
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
    }
  ];

  // Add a constant marker size
  const MARKER_SIZE = 10;

  // Set initial filter to 'city'
  useEffect(() => {
    setFilter('city');
  }, []); // Run only once on component mount

  // Modify the handleMapFilter to preserve filtered stations
  const handleMapFilter = (newFilter: string) => {
    setFilter(newFilter);
  }

  const handleStationClick = (stat: StationStats) => {
    const station = bikeStations.find(s => s.station_id === stat.station_info.station_id);
    if (station) {
      handleStationSelect(station);
      setFilteredStats([stat]);
      setSearchTerm(station.name);
      map?.setView([station.lat, station.lon], 17);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Analytics</h1>
      
      <Card className="bg-white shadow-lg">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <CardTitle className="text-2xl text-gray-800">Stations Map</CardTitle>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-500 whitespace-nowrap">From:</span>
                <div className="relative w-full sm:w-[200px]">
                  <Input
                    type="text"
                    placeholder="2023-01-01 00:00:00"
                    value={tempFromDate}
                    onChange={(e) => handleFromDateChange(e.target.value)}
                    className={`w-full ${!isValidTimestamp(tempFromDate) && tempFromDate !== "" ? "border-red-500" : ""}`}
                  />
                  {timeframeData.from_date && (
                    <div className="absolute -bottom-5 left-0 text-xs text-gray-400">
                      {timeframeData.from_date}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-500 whitespace-nowrap">To:</span>
                <div className="relative w-full sm:w-[200px]">
                  <Input
                    type="text"
                    placeholder={getCurrentFormattedDate()}
                    value={tempToDate}
                    onChange={(e) => handleToDateChange(e.target.value)}
                    className={`w-full ${!isValidTimestamp(tempToDate) && tempToDate !== "" ? "border-red-500" : ""}`}
                  />
                  {timeframeData.to_date && (
                    <div className="absolute -bottom-5 left-0 text-xs text-gray-400">
                      {timeframeData.to_date}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleApplyDates}
                disabled={
                  (tempFromDate !== "" && !isValidTimestamp(tempFromDate)) ||
                  (tempToDate !== "" && !isValidTimestamp(tempToDate)) ||
                  isLoading
                }
                className={`px-4 py-2 rounded-md w-full sm:w-auto flex items-center justify-center gap-2 ${
                  (tempFromDate !== "" && !isValidTimestamp(tempFromDate)) ||
                  (tempToDate !== "" && !isValidTimestamp(tempToDate))
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  'Apply'
                )}
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
                    setFilter={handleMapFilter}  // Use the new handler
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
                    setFilter={handleMapFilter}  // Use the new handler
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
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  setFilteredStats={setFilteredStats}
                  stationStats={stationStats}
                  setFilter={setFilter}
                  setFilterValue={setFilterValue}
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
                avg_capacity: filteredStats.length > 0
                  ? +(filteredStats.reduce((sum, station) => sum + station.capacity, 0) / filteredStats.length).toFixed(2)
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
                  : 0,
                total_events: filteredStats.length > 0
                  ? filteredStats.reduce((sum, station) => sum + station.events, 0)
                  : 0,
                total_bikes_in: filteredStats.length > 0
                  ? filteredStats.reduce((sum, station) => sum + station.use_in, 0)
                  : 0,
                total_bikes_out: filteredStats.length > 0
                  ? filteredStats.reduce((sum, station) => sum + station.use_out, 0)
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
                  key: 'avg_capacity',
                  header: 'Avg Capacity',
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
                },
                {
                  key: 'total_events',
                  header: 'Total Events',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toLocaleString();
                  }
                },
                {
                  key: 'total_bikes_in',
                  header: 'Total Bikes In',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toLocaleString();
                  }
                },
                {
                  key: 'total_bikes_out',
                  header: 'Total Bikes Out',
                  render: (value) => {
                    const numValue = value as number;
                    return numValue.toLocaleString();
                  }
                }
              ] as Column<SummaryData>[]}
              className="mb-8"
            />

            <DataTable 
              columns={statsColumns}
              data={filteredStats}
              className="mt-4"
              onRowClick={handleStationClick}
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
                  tickFormatter={(value) => {
                    const hour = parseInt(value);
                    return `${hour.toString().padStart(2, '0')}:00`;
                  }}
                  ticks={Array.from({ length: 24 }, (_, i) => i)} 
                  interval={1}
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