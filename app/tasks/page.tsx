"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

// Actualiza esta definición de tipo
type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  free_bikes: number;
  empty_slots: number;
  timestamp: string;
  extra: {
    online: boolean; // Cambiado de 'status: string' a 'online: boolean'
    uid: string;
    normal_bikes: number;
    ebikes: number;
  };
};

export default function TasksPage() {
  const [emptyStations, setEmptyStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  const fetchStations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/bicing')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Received data:', data)

      if (!Array.isArray(data)) {
        throw new Error('Received data is not an array')
      }

      const formattedStations: Station[] = data.map((station: any) => ({
        ...station,
        extra: {
          ...station.extra,
          online: station.extra.status === "OPEN", // Convertimos 'status' a 'online'
        }
      }))

      const empty = formattedStations.filter((station: Station) => station.free_bikes === 0)
      setEmptyStations(empty)
    } catch (error) {
      console.error('Error fetching stations:', error)
      setError(`Error loading stations: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setEmptyStations([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStations()
  }, [])

  const handleRefresh = () => {
    fetchStations()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Tasks</h1>
      
      <Card className="bg-white shadow-lg mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-gray-800">Empty Stations Map</CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            {isLoading ? (
              <p className="text-center">Loading stations...</p>
            ) : error ? (
              <p className="text-center text-red-500">{error}</p>
            ) : (
              <MapComponent 
                filteredStations={emptyStations} 
                selectedStation={selectedStation}
                setSelectedStation={setSelectedStation}
                setMap={() => {}}
                onRefresh={handleRefresh}
              />
            )}
          </div>
          {selectedStation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedStation.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <span className="text-red-600">
                  Available bikes: {selectedStation.free_bikes}
                </span>
                <span className="text-gray-600">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Empty Stations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{emptyStations.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}