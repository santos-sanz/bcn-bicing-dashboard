"use client"

import { useState, useEffect, useRef, SetStateAction } from 'react'
import { Bike, MapIcon, Lock, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from 'next/dynamic'
import { Map as LeafletMap } from 'leaflet' // Importa el tipo Map de Leaflet

// Carga dinámica del componente del mapa
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Cargando mapa...</p>
})


export default function Component() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('all')
  const [map, setMap] = useState<LeafletMap | null>(null) // Especifica el tipo correcto aquí
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [metrics, setMetrics] = useState({
    stations: 0,
    availableBikes: 0,
    availableDocks: 0
  })
  const [bikeStations, setBikeStations] = useState<Station[]>([])
  const [usageData, setUsageData] = useState([])

  useEffect(() => {
    fetch('/mock_data/mock_stations_real.json')
      .then(response => response.json())
      .then(data => {
        setBikeStations(data)
        setFilteredStations(data)
        updateMetrics(data)
      })
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
    const filtered = bikeStations.filter(station => 
      filter === 'all' || station.status === filter
    )
    setFilteredStations(filtered)
    updateMetrics(filtered)
  }, [filter, bikeStations])

  const updateMetrics = (stations: any[]) => {
    const totalStations = stations.length
    const availableBikes = stations.reduce((sum: any, station: { num_bikes_available: any }) => sum + station.num_bikes_available, 0)
    const availableDocks = stations.reduce((sum: any, station: { num_docks_available: any }) => sum + station.num_docks_available, 0)
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
      if (station && 'lat' in station && 'lng' in station && map) {
        map.setView([station.lat, station.lng], 15)
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="text-2xl">Stations Map</CardTitle>
            <div className="flex items-center gap-4 relative z-10">
              <AutocompleteSearch onSelect={handleStationSelect} bikeStations={bikeStations} />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="IN_SERVICE">Available</SelectItem>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                  <SelectItem value="FULL">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-lg overflow-hidden relative" style={{ zIndex: 1 }}>
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
              <p className="text-sm text-gray-600">District: {selectedStation.district}</p>
              <p className="text-sm text-gray-600">Suburb: {selectedStation.suburb}</p>
              <p className="text-sm text-gray-600">Status: {selectedStation.status}</p>
              <div className="mt-2 flex justify-between">
                <span className="text-green-600">Available bikes: {selectedStation.num_bikes_available}</span>
                <span className="text-blue-600">Available docks: {selectedStation.num_docks_available}</span>
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
                <XAxis dataKey="time" tickFormatter={(value) => value.slice(0, 5)}/>
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="in_bikes" stroke="#3b82f6" strokeWidth={1} />
                <Line type="monotone" dataKey="out_bikes" stroke="#f63b54" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Station = {
  station_id: number;
  name: string;
  lat: number;
  lng: number;
  status: string;
  num_bikes_available: number;
  num_docks_available: number;
  district: string;
  suburb: string;
};

const AutocompleteSearch = ({ onSelect, bikeStations }: { onSelect: (station: Station | null) => void, bikeStations: Station[] }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Station[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const filteredSuggestions = bikeStations.filter(station => 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="relative z-20">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search station or district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
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
              key={station.station_id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(station)}
            >
              {station.name} - {station.suburb} - {station.district}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}