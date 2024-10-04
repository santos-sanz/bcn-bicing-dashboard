"use client"

import { useState, useEffect, useRef } from 'react'
import { Bike, MapIcon, Lock, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from 'next/dynamic'
import { Map as LeafletMap } from 'leaflet'
import axios from 'axios'

// Importación dinámica del componente del mapa (sin cambios)
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Cargando mapa...</p>
})

export default function Component() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('all')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [metrics, setMetrics] = useState({
    stations: 0,
    availableBikes: 0,
    availableDocks: 0
  })
  const [bikeStations, setBikeStations] = useState<Station[]>([])
  const [usageData, setUsageData] = useState([])

  useEffect(() => {
    const fetchBicingData = async () => {
      try {
        const response = await axios.get('/api/bicing')
        const stations = response.data.network.stations
        setBikeStations(stations)
        setFilteredStations(stations)
        updateMetrics(stations)
      } catch (error) {
        console.error('Error al obtener los datos de Bicing:', error)
      }
    }

    fetchBicingData()
  }, [])

  useEffect(() => {
    fetch('/mock_data/mock_flow_real.json')
      .then(response => response.json())
      .then(data => setUsageData(data))
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
          return station.free_bikes === 0 && station.extra.online;
        case 'FULL':
          return station.empty_slots === 0 && station.extra.online;
        case 'AVAILABLE':
          return station.free_bikes > 0 && station.empty_slots > 0 && station.extra.online;
        default:
          return true;
      }
    })
    setFilteredStations(filtered)
    updateMetrics(filtered)
  }, [filter, bikeStations])

  const updateMetrics = (stations: Station[]) => {
    const totalStations = stations.length
    const availableBikes = stations.reduce((sum, station) => sum + station.free_bikes, 0)
    const availableDocks = stations.reduce((sum, station) => sum + station.empty_slots, 0)
    setMetrics({
      stations: totalStations,
      availableBikes,
      availableDocks
    })
  }

  const handleStationSelect = (station: Station | null) => {
    setSelectedStation(station)
    if (station) {
      const filtered: Station[] = [station]
      setFilteredStations(filtered)
      updateMetrics(filtered)
      if (station && 'latitude' in station && 'longitude' in station && map) {
        map.setView([station.latitude, station.longitude], 15)
      }
    } else {
      setFilteredStations(bikeStations)
      updateMetrics(bikeStations)
      if (map) {
        map.setView([41.3874, 2.1686], 13)
      }
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Barcelona Bicing Analytics</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-primary/10">
              <MapIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stations</p>
              <p className="text-2xl font-bold">{metrics.stations}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Bike className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available Bikes</p>
              <p className="text-2xl font-bold">{metrics.availableBikes}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available Docks</p>
              <p className="text-2xl font-bold">{metrics.availableDocks}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl">Stations Map</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <AutocompleteSearch onSelect={handleStationSelect} bikeStations={bikeStations} />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden relative" style={{ zIndex: 1 }}>
            <MapComponent
              filteredStations={filteredStations}
              selectedStation={selectedStation}
              setSelectedStation={setSelectedStation}
              setMap={setMap}
            />
          </div>
          {selectedStation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow">
              <h3 className="font-semibold text-lg">{selectedStation.name}</h3>
              <div className="mt-2 flex flex-col sm:flex-row justify-between gap-2">
                <span className="text-green-600">Available bikes: {selectedStation.free_bikes}</span>
                <span className="text-blue-600">Available docks: {selectedStation.empty_slots}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Usage Flows - Last 24 hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(value) => value} 
                  domain={['dataMin', 'dataMax']} 
                  ticks={Array.from({ length: 13 }, (_, i) => `${(i * 2).toString().padStart(2, '0')}:00`)} 
                  interval={0} 
                />
                <YAxis />
                <Tooltip />
                <Line 
                  type="natural" 
                  dataKey="in_bikes" 
                  stroke="#3b82f6" 
                  strokeWidth={0.1} 
                  dot={{ stroke: '#3b82f6', strokeWidth: 0.1, fill: '#000' }} 
                />
                <Line 
                  type="natural" 
                  dataKey="out_bikes" 
                  stroke="#f63b54" 
                  strokeWidth={0.1} 
                  dot={{ stroke: '#f63b54', strokeWidth: 0.1, fill: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Station = {
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
  };
};

const AutocompleteSearch = ({ onSelect, bikeStations }: { onSelect: (station: Station | null) => void, bikeStations: Station[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Station[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const filteredSuggestions = bikeStations.filter(station => 
        station.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setSuggestions(filteredSuggestions)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [searchTerm, bikeStations])

  const handleSelect = (station: Station | null) => {
    if (station) {
      setSearchTerm(station.name)
    }
    setIsOpen(false)
    onSelect(station)
  }

  const handleClear = () => {
    setSearchTerm('')
    setIsOpen(false)
    onSelect(null)
    inputRef.current?.focus()
  }

  return (
    <div className="relative z-20 w-full sm:w-64">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search station..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-0 mr-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto">
          {suggestions.map((station) => (
            <li
              key={station.id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(station)}
            >
              {station.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}