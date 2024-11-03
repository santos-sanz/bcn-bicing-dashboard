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
import { format } from 'date-fns'
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/ui/DataTable"

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
})

const getStationColor = (station: Station): string => {
  if (station.routeColor && station.routeColor.length > 0) {
    return station.routeColor
  }
  
  if (station.status === 'IN_SERVICE') {
    if (station.num_bikes_available === 0) {
      return '#ff0000' // Rojo para estaciones vacías
    } else if (station.num_docks_available === 0) {
      return '#FFA500' // Naranja para estaciones llenas
    } else {
      return '#00FF00' // Verde para estaciones disponibles
    }
  }
  
  return '#000000' // Negro para estaciones fuera de servicio
}

// Añade esta interfaz antes de la función AnalyticsPage
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export default function AnalyticsPage() {
  const formatCurrentDate = () => {
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
  const router = useRouter()
  const [getMarkerColor, setGetMarkerColor] = useState<(station: Station) => string>(() => () => '#3b82f6')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [tempFromDate, setTempFromDate] = useState<string>('2023-01-01 00:00:00')
  const [tempToDate, setTempToDate] = useState<string>(formatCurrentDate())

  const updateMetrics = useCallback((stations: Station[]) => {
    if (!stations || stations.length === 0) {
      setMetrics({
        stations: 0,
        availableBikes: 0,
        availableDocks: 0,
        disabledDocks: 0,
        disabledBikes: 0,
        disabledStations: 0
      })
      return
    }

    const totalStations = stations.length
    const availableBikes = stations.reduce((sum, station) => sum + (station.num_bikes_available || 0), 0)
    const availableDocks = stations.reduce((sum, station) => sum + (station.num_docks_available || 0), 0)
    const disabledDocks = stations.reduce((sum, station) => sum + (station.num_docks_disabled || 0), 0)
    const disabledBikes = stations.reduce((sum, station) => sum + (station.num_bikes_disabled || 0), 0)
    const disabledStationsCount = stations.filter(station => station.status !== 'IN_SERVICE').length

    setMetrics({
      stations: totalStations,
      availableBikes,
      availableDocks,
      disabledDocks,
      disabledBikes,
      disabledStations: disabledStationsCount
    })
  }, [])

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
    fetch('/mock_data/mock_flow_real.json')
      .then(response => response.json())
      .then(data => setUsageData(data))
  }, [router])

  useEffect(() => {
    const fetchBicingData = async () => {
      try {
        const response = await axios.get('/api/bikesystem')
        const stations = response.data
        const stationsWithDefaultColor = stations.map((station: Station) => ({
          ...station,
          routeColor: '#3b82f6' // Color azul por defecto
        }))
        setBikeStations(stationsWithDefaultColor)
        setFilteredStations(stationsWithDefaultColor)
        updateMetrics(stationsWithDefaultColor)
      } catch (error) {
        console.error('Error fetching Bicing data:', error)
      }
    }

    fetchBicingData()
  }, [updateMetrics])

  useEffect(() => {
    if (map && typeof map.setView === 'function') {
      map.setView([41.3874, 2.1686], 13)
    }
  }, [map])

  useEffect(() => {
    if (!bikeStations.length) return;
    
    setFilteredStations(bikeStations);
    updateMetrics(bikeStations);
  }, [bikeStations, updateMetrics])

  const handleStationSelect = (station: Station | null) => {
    setSelectedStation(station)
    if (station) {
      const filtered: Station[] = [station]
      setFilteredStations(filtered)
      setFilter('station')
      setFilterValue(station.name)
      if (station && 'lat' in station && 'lon' in station && map) {
        map.setView([station.lat, station.lon], 15)
      }
    } else {
      setFilteredStations(bikeStations)
      setFilter('city')
      setFilterValue('')
      if (map) {
        map.setView([41.3874, 2.1686], 13)
      }
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
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

  // Ejemplo de uso de la tabla
  const columns: Column<Station>[] = [
    {
      key: 'name' as keyof Station,
      header: 'Station',
    },
    {
      key: 'num_bikes_available' as keyof Station,
      header: 'Bikes Available',
    },
    {
      key: 'num_docks_available' as keyof Station,
      header: 'Docks Available',
      render: (value: number, station: Station) => (
        <span className={value === 0 ? 'text-red-500' : 'text-green-500'}>
          {value}
        </span>
      ),
    },
    {
      key: 'status' as keyof Station,
      header: 'Status',
    }
  ]

  // Añade esto justo antes de la definición de columns
  const summaryColumns = [
    {
      key: 'location' as const,
      header: 'Location',
    },
    {
      key: 'total' as const,
      header: 'Total Stations',
    },
    {
      key: 'bikes' as const,
      header: 'Available Bikes',
    },
    {
      key: 'docks' as const,
      header: 'Available Docks',
    },
    {
      key: 'status' as const,
      header: 'Active Stations',
    }
  ]

  // Función auxiliar para obtener el nombre del filtro actual
  const getFilterLocation = () => {
    if (selectedStation) {
      return selectedStation.name;
    }
    
    // Si hay estaciones filtradas y son menos que el total, significa que hay un filtro activo
    if (filteredStations.length > 0 && filteredStations.length < bikeStations.length) {
      switch (filter) {
        case 'district':
          return `District: ${filterValue || 'Unknown'}`;
        case 'neighborhood':
          return `Neighborhood: ${filterValue || 'Unknown'}`;
        case 'status':
          return `Status: ${filterValue || 'Unknown'}`;
        default:
          // Si hay filtro pero no es ninguno de los anteriores
          return `Filtered Stations (${filteredStations.length})`;
      }
    }

    // Si no hay filtro activo o están todas las estaciones
    return 'Barcelona (All Stations)';
  };

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
                    placeholder={formatCurrentDate()}
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
            <MapComponent
              filteredStations={filteredStations}
              selectedStation={selectedStation}
              setSelectedStation={setSelectedStation}
              setMap={setMap}
              onRefresh={refreshData}
              getStationColor={getStationColor}
              showUpdateBar={false}
            />
          </div>
        </CardContent>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Reorganización de los controles en columna para móviles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {/* Grupo 1: Botones Default/Heat Map */}
              <div className="flex items-center justify-center sm:justify-end">
                <button 
                  className={`px-3 py-1 rounded-l-md ${!isHeatMap ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  onClick={() => setIsHeatMap(false)}
                >
                  Default
                </button>
                <button
                  className={`px-3 py-1 rounded-r-md ${isHeatMap ? 'bg-blue-500 text-white' : 'bg-gray-200'}`} 
                  onClick={() => setIsHeatMap(true)}
                >
                  Heat Map
                </button>
              </div>

              {/* Grupo 2: Controles de Mapa */}
              <div className="w-full">
                {!isHeatMap ? (
                  <DefaultMapControls 
                    filter={filter}
                    setFilter={setFilter}
                    filteredStations={filteredStations}
                    setFilteredStations={setFilteredStations}
                  />
                ) : (
                  <HeatMapControls 
                    heatMapMode={heatMapMode}
                    setHeatMapMode={setHeatMapMode}
                    filteredStations={filteredStations}
                    setFilteredStations={setFilteredStations}
                  />
                )}
              </div>

              {/* Grupo 3: Búsqueda */}
              <div className="w-full">
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

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">Stations</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabla de resumen - Actualizada para usar las estaciones filtradas */}
          <DataTable 
            data={[{
              location: getFilterLocation(),
              total: filteredStations.length,
              bikes: filteredStations.reduce((sum, station) => sum + (station.num_bikes_available || 0), 0),
              docks: filteredStations.reduce((sum, station) => sum + (station.num_docks_available || 0), 0),
              status: `${filteredStations.filter(station => station.status === 'IN_SERVICE').length}/${filteredStations.length}`
            }]} 
            columns={summaryColumns}
            className="mb-8"
          />
          
          {/* Tabla original - Ya usa filteredStations */}
          <DataTable 
            data={filteredStations} 
            columns={columns}
            className="mt-4"
          />
        </CardContent>
      </Card>
      
    </div>
  )
}