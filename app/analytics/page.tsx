"use client"

import { useState, useEffect } from 'react'
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
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
})

export default function AnalyticsPage() {
  const [usageData, setUsageData] = useState([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('city')
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
  const router = useRouter()

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
        setBikeStations(stations)
        setFilteredStations(stations)
        updateMetrics(stations)
      } catch (error) {
        console.error('Error fetching Bicing data:', error)
      }
    }

    fetchBicingData()
  }, [])

  useEffect(() => {
    if (map && typeof map.setView === 'function') {
      map.setView([41.3874, 2.1686], 13)
    }
  }, [map])

  useEffect(() => {
    const filtered = bikeStations.filter(station => {
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
    })
    setFilteredStations(filtered)
    updateMetrics(filtered)
  }, [filter, bikeStations])

  const updateMetrics = (stations: Station[]) => {
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
  }

  const handleStationSelect = (station: Station | null) => {
    setSelectedStation(station)
    if (station) {
      const filtered: Station[] = [station]
      setFilteredStations(filtered)
      updateMetrics(filtered)
      if (station && 'lat' in station && 'lon' in station && map) {
        map.setView([station.lat, station.lon], 15)
      }
    } else {
      setFilteredStations(bikeStations)
      updateMetrics(bikeStations)
      if (map) {
        map.setView([41.3874, 2.1686], 13)
      }
    }
  }

  const refreshData = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/bikesystem?t=${timestamp}`)
      const stations = response.data
      setBikeStations(stations)
      setFilteredStations(stations)
      updateMetrics(stations)
    } catch (error) {
      console.error('Error fetching Bicing data:', error)
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

  const getMarkerColor = (station: Station) => {
    switch (filter) {
      case 'city':
        return '#3b82f6' // Un solo color para toda la ciudad
      case 'district':
        // Genera un color consistente basado en el distrito
        return `hsl(${hashString(station.district || '') % 360}, 70%, 50%)`
      case 'suburb':
        // Genera un color consistente basado en el barrio
        return `hsl(${hashString(station.suburb || '') % 360}, 70%, 50%)`
      case 'postcode':
        // Genera un color consistente basado en el código postal
        return `hsl(${hashString(station.post_code || '') % 360}, 70%, 50%)`
      default:
        return '#3b82f6'
    }
  }

  const hashString = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str?.length || 0; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Analytics</h1>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl text-gray-800">Stations Map</CardTitle>
            <div className="w-[300px]">
              <input
                type="range"
                min="0"
                max="3" 
                value={["city", "district", "suburb", "postcode"].indexOf(filter)}
                onChange={(e) => {
                  const values = ["city", "district", "suburb", "postcode"];
                  setFilter(values[parseInt(e.target.value)]);
                }}
                className="w-full"
                step="1"
              />
              <div className="flex justify-center gap-12 text-xs text-gray-600 mt-1">
                <span>City</span>
                <span>District</span>
                <span>Suburb</span>
                <span>Post_Code</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <AutocompleteSearch 
                onSelect={handleStationSelect} 
                bikeStations={bikeStations} 
                setFilteredStations={setFilteredStations} 
                updateMetrics={updateMetrics}
              />
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
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">Usage Flows - Last 24 hours</CardTitle>
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