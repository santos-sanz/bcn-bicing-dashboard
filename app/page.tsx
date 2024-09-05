"use client"

import { useState, useEffect, useRef, SetStateAction } from 'react'
import { Bike, MapIcon, Lock, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dynamic from 'next/dynamic'
import { Map } from 'leaflet' // Importa el tipo Map de Leaflet

// Carga dinámica del componente del mapa
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p>Cargando mapa...</p>
})

// Mock data for bike stations
const bikeStations = [
  { id: 1, name: "Plaça Catalunya", lat: 41.3874, lng: 2.1686, status: "green", bikes: 15, docks: 5, zone: "Ciutat Vella" },
  { id: 2, name: "Passeig de Gràcia", lat: 41.3915, lng: 2.1652, status: "yellow", bikes: 8, docks: 12, zone: "Eixample" },
  { id: 3, name: "La Rambla", lat: 41.3797, lng: 2.1732, status: "red", bikes: 2, docks: 18, zone: "Ciutat Vella" },
  { id: 4, name: "Barceloneta", lat: 41.3842, lng: 2.1872, status: "green", bikes: 20, docks: 0, zone: "Ciutat Vella" },
  { id: 5, name: "Sagrada Família", lat: 41.4036, lng: 2.1744, status: "yellow", bikes: 10, docks: 10, zone: "Eixample" },
]

// Mock data for usage chart
const usageData = [
  { time: '00:00', users: 1000 },
  { time: '04:00', users: 500 },
  { time: '08:00', users: 3000 },
  { time: '12:00', users: 2000 },
  { time: '16:00', users: 4000 },
  { time: '20:00', users: 3000 },
]

export default function Component() {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [filter, setFilter] = useState('all')
  const [map, setMap] = useState<Map | null>(null) // Especifica el tipo correcto aquí
  const [filteredStations, setFilteredStations] = useState(bikeStations)
  const [metrics, setMetrics] = useState({
    stations: 0,
    availableBikes: 0,
    availableDocks: 0
  })

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
  }, [filter])

  const updateMetrics = (stations: any[]) => {
    const totalStations = stations.length
    const availableBikes = stations.reduce((sum: any, station: { bikes: any }) => sum + station.bikes, 0)
    const availableDocks = stations.reduce((sum: any, station: { docks: any }) => sum + station.docks, 0)
    setMetrics({
      stations: totalStations,
      availableBikes,
      availableDocks
    })
  }

  const handleStationSelect = (station: Station | null) => {
    setSelectedStation(station)
    if (station) {
      const filtered = [station as unknown as { id: number; name: string; lat: number; lng: number; status: string; bikes: number; docks: number; zone: string; }]
      setFilteredStations(filtered)
      updateMetrics(filtered)
      if (station && 'lat' in station && 'lng' in station) {
        map?.setView([station.lat, station.lng], 15)
      }
    } else {
      setFilteredStations(bikeStations)
      updateMetrics(bikeStations)
      map?.setView([41.3874, 2.1686], 13)
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
            <div className="flex items-center gap-4">
              <AutocompleteSearch onSelect={handleStationSelect} />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  <SelectItem value="green">Available</SelectItem>
                  <SelectItem value="yellow">Limited</SelectItem>
                  <SelectItem value="red">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] rounded-lg overflow-hidden">
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
              <p className="text-sm text-gray-600">Zona: {selectedStation.zone}</p>
              <p className="text-sm text-gray-600">Estado: {selectedStation.status}</p>
              <div className="mt-2 flex justify-between">
                <span className="text-green-600">Bicicletas Disponibles: {selectedStation.bikes}</span>
                <span className="text-blue-600">Espacios Disponibles: {selectedStation.docks}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type Station = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status: string;
  bikes: number;
  docks: number;
  zone: string;
};

const AutocompleteSearch = ({ onSelect }: { onSelect: (station: Station | null) => void }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Station[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const filteredSuggestions = bikeStations.filter(station => 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.zone.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setSuggestions(filteredSuggestions)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [searchTerm])
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
    <div className="relative">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search station or zone..."
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
              key={station.id}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(station)}
            >
              {station.name} - {station.zone}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}