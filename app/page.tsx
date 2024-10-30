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
    availableDocks: 0
  })
  const [bikeStations, setBikeStations] = useState<Station[]>([])
  const [usageData, setUsageData] = useState([])

  useEffect(() => {
    const fetchBicingData = async () => {
      try {
        const response = await axios.get('/api/bicing')
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

  const refreshData = async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/bicing?t=${timestamp}`)
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
      </div>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl text-gray-800">Stations Map</CardTitle>
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
                <span className={selectedStation.free_bikes === 0 ? "text-red-600" : "text-gray-600"}>
                  Available bikes: {selectedStation.free_bikes}
                </span>
                <span className={selectedStation.empty_slots === 0 ? "text-amber-500" : "text-gray-600"}>
                  Empty slots: {selectedStation.empty_slots}
                </span>
                <span className="text-gray-600">Normal bikes: {selectedStation.extra.normal_bikes}</span>
                <span className="text-gray-600">E-bikes: {selectedStation.extra.ebikes}</span>
                <span className="text-gray-600">Status: {selectedStation.extra.online ? 'Online' : 'Offline'}</span>
                <span className="text-gray-600">Last update: {new Date(selectedStation.timestamp).toLocaleString('en-US', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'Europe/Madrid'
                })}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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