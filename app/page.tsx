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
import { Station } from '@/types/station'

// Importación dinámica del componente del mapa (sin cambios)
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Loading map...</p>
})

export default function Component() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('all')
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
  const [usageData, setUsageData] = useState([])

  useEffect(() => {
    const fetchBicingData = async () => {
      try {
        const response = await axios.get('/api/bikesystem')
        const stations = response.data // The API now returns the stations directly
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
      const stations = response.data // The API now returns the stations directly
      setBikeStations(stations)
      setFilteredStations(stations)
      updateMetrics(stations)
    } catch (error) {
      console.error('Error fetching Bicing data:', error)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Barcelona Bicing Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-100">
              <MapIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Stations</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.stations}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-green-100">
              <Bike className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Available Bikes</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.availableBikes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Available Docks</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.availableDocks}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-gray-100">
              <MapIcon className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Disabled Stations</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.disabledStations}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-gray-100">
              <Bike className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Disabled Bikes</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.disabledBikes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 rounded-full bg-gray-100">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Disabled Docks</p>
              <p className="text-3xl font-bold text-gray-800">{metrics.disabledDocks}</p>
            </div>
          </CardContent>
          </Card>
      </div>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl text-gray-800">Stations Map</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <AutocompleteSearch 
                onSelect={handleStationSelect} 
                bikeStations={bikeStations} 
                setFilteredStations={setFilteredStations} 
                updateMetrics={updateMetrics}
              />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
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
          {selectedStation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedStation.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <span className={selectedStation.num_bikes_available === 0 ? "text-red-600" : "text-gray-600"}>
                  Available bikes: {selectedStation.num_bikes_available ?? 0}
                </span>
                <span className={selectedStation.num_docks_available === 0 ? "text-amber-500" : "text-gray-600"}>
                  Empty slots: {selectedStation.num_docks_available ?? 0}
                </span>
                <span className="text-gray-600">
                  Disabled bikes: {selectedStation.num_bikes_disabled ?? 0}
                </span>
                <span className="text-gray-600">
                  Disabled docks: {selectedStation.num_docks_disabled ?? 0}
                </span>
                <span className="text-gray-600">
                  Mechanical bikes: {selectedStation.num_bikes_available_types?.mechanical ?? 0}
                </span>
                <span className="text-gray-600">
                  Electric bikes: {selectedStation.num_bikes_available_types?.ebike ?? 0}
                </span>
                <span className={selectedStation.status !== 'IN_SERVICE' ? 'text-red-600' : 'text-gray-600'}>
                  Status: {selectedStation.status ?? 'Offline'}
                </span>
                <span className="text-gray-600">
                  Station ID: {selectedStation.station_id ?? 'N/A'}
                </span>
                <span className="text-gray-600">
                  Config: {selectedStation.physical_configuration ?? 'N/A'}
                </span>
                <span className="text-gray-600">
                  Capacity: {selectedStation.capacity ?? 'N/A'}
                </span>
                <span className="text-gray-600">
                  Last update: {new Date(selectedStation.last_reported * 1000).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Madrid'
                  })}
                </span>
                <span className="text-gray-600">
                  Post code: {selectedStation.post_code ?? 'N/A'}
                </span>
                <span className="text-gray-600">
                  Suburb: {selectedStation.suburb ?? 'N/A'}
                </span>
                <span className="text-gray-600">
                  District: {selectedStation.district ?? 'N/A'}
                </span>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const AutocompleteSearch = ({ onSelect, bikeStations, setFilteredStations, updateMetrics }: { 
  onSelect: (station: Station | null) => void, 
  bikeStations: Station[], 
  setFilteredStations: React.Dispatch<React.SetStateAction<Station[]>>,
  updateMetrics: (stations: Station[]) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<(Station | { type: 'post_code' | 'suburb' | 'district', value: string | undefined, label?: string })[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowerTerm = searchTerm.toLowerCase()
      const stationMatches = bikeStations
        .filter(station => station.name.toLowerCase().includes(lowerTerm))
        .slice(0, 10) 

      const postCodeMatches = Array.from(new Set(bikeStations.map(station => station.post_code)))
        .filter(post_code => post_code && post_code.toLowerCase().includes(lowerTerm))
        .map(post_code => ({ type: 'post_code' as const, value: post_code, label: `P-${post_code}` }))
      
      const suburbMatches = Array.from(new Set(bikeStations.map(station => station.suburb)))
        .filter(suburb => suburb && suburb.toLowerCase().includes(lowerTerm))
        .map(suburb => ({ type: 'suburb' as const, value: suburb, label: `S-${suburb}` }))
  
      const districtMatches = Array.from(new Set(bikeStations.map(station => station.district)))
        .filter(district => district && district.toLowerCase().includes(lowerTerm))
        .map(district => ({ type: 'district' as const, value: district, label: `D-${district}` }))
  
      const combinedSuggestions = [
        ...stationMatches,
        ...postCodeMatches,
        ...suburbMatches,
        ...districtMatches
      ]
  
      setSuggestions(combinedSuggestions)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [searchTerm, bikeStations])
  const handleSelect = (item: Station | { type: 'post_code' | 'suburb' | 'district', value: string | undefined, label?: string }) => {
    if ('type' in item) {
      // Es un post_code, suburb o district
      const prefijo = item.type === 'post_code' ? 'P-' :
                      item.type === 'suburb' ? 'S-' :
                      'D-'
      setSearchTerm(item.label || '')
      setIsOpen(false)
      
      // Filtrar estaciones según el tipo seleccionado
      let filtered: Station[] = []
      switch(item.type) {
        case 'post_code':
          filtered = bikeStations.filter(station => station.post_code === item.value)
          break
        case 'suburb':
          filtered = bikeStations.filter(station => station.suburb === item.value)
          break
        case 'district':
          filtered = bikeStations.filter(station => station.district === item.value)
          break
      }
      onSelect(null) // Limpiar estación seleccionada
      setFilteredStations(filtered)
      updateMetrics(filtered)
    } else {
      // Es una estación
      if ('name' in item) {
        setSearchTerm(item.name)
        setIsOpen(false)
        onSelect(item as Station)
      }
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    setIsOpen(false)
    onSelect(null)
    setFilteredStations(bikeStations)
    updateMetrics(bikeStations)
    inputRef.current?.focus()
  }

  return (
    <div className="relative z-20 w-full sm:w-64">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
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
          {suggestions.map((item, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(item)}
            >
              {'type' in item ? item.label : item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}