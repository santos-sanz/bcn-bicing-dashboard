"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import type { Station } from '@/components/MapComponent'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

export default function TasksPage() {
  const [emptyStations, setEmptyStations] = useState<Station[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  const [fillPercentage, setFillPercentage] = useState<number>(20) // Cambiado a 20%
  const [truckCapacity, setTruckCapacity] = useState<number>(20) // Cambiado a 20
  const [routes, setRoutes] = useState<Station[][]>([])
  const [routeColors, setRouteColors] = useState<string[]>([])
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)

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
          online: station.extra.status === "OPEN",
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
    setRoutes([])
    setRouteColors([])
  }

  const colorPalette = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
    '#33FFF3', '#FFC300', '#FF8C33', '#8DFF33', '#33FF8C'
  ];

  const calculateRoutes = () => {
    if (truckCapacity <= 0) {
      alert("Truck capacity must be greater than 0.")
      return
    }

    let totalBikesNeeded = 0
    const stationsNeedingBikes = emptyStations.map(station => {
      const desiredBikes = Math.ceil((fillPercentage / 100) * (station.free_bikes + station.empty_slots))
      const bikesNeeded = desiredBikes - station.free_bikes
      return { ...station, bikesNeeded: bikesNeeded > 0 ? bikesNeeded : 0 }
    }).filter(station => station.bikesNeeded > 0)

    totalBikesNeeded = stationsNeedingBikes.reduce((acc, station) => acc + station.bikesNeeded, 0)

    const routesNeeded = Math.ceil(totalBikesNeeded / truckCapacity)

    const assignedRouteColors = colorPalette.slice(0, routesNeeded)
    setRouteColors(assignedRouteColors)

    // Función para calcular la distancia entre dos puntos
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371 // Radio de la Tierra en km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c // Distancia en km
    }

    // Algoritmo de agrupación basado en proximidad
    const assignedRoutes: Station[][] = []
    let remainingStations = [...stationsNeedingBikes]

    while (remainingStations.length > 0) {
      const route: Station[] = [remainingStations[0]]
      let currentBikes = remainingStations[0].bikesNeeded
      remainingStations = remainingStations.slice(1)

      while (currentBikes < truckCapacity && remainingStations.length > 0) {
        // Encontrar la estación más cercana
        let nearestIndex = 0
        let nearestDistance = Infinity
        for (let i = 0; i < remainingStations.length; i++) {
          const distance = calculateDistance(
            route[route.length - 1].latitude, route[route.length - 1].longitude,
            remainingStations[i].latitude, remainingStations[i].longitude
          )
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const nextStation = remainingStations[nearestIndex]
        if (currentBikes + nextStation.bikesNeeded <= truckCapacity) {
          route.push(nextStation)
          currentBikes += nextStation.bikesNeeded
          remainingStations.splice(nearestIndex, 1)
        } else {
          break
        }
      }

      assignedRoutes.push(route)
    }

    // Asignar colores a las rutas
    const updatedStations = emptyStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.some(routeStation => routeStation.id === station.id)
      )
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor: routeIndex !== -1 ? assignedRouteColors[routeIndex] : ''
        }
      }
    })

    setEmptyStations(updatedStations)
    setRoutes(assignedRoutes)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Management Tasks</h1>
      
      {/* Añadimos el contador de estaciones vacías aquí */}
      <div className="text-2xl font-semibold text-center mb-4">
        Empty Stations: <span className="text-red-600">{emptyStations.length}</span>
      </div>
      
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

      <Card className="bg-white shadow-lg mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-gray-800">Supply Routes</CardTitle>
            <Button
              onClick={() => setIsPlanningExpanded(!isPlanningExpanded)}
              variant="ghost"
              size="sm"
            >
              {isPlanningExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        {isPlanningExpanded && (
          <CardContent>
            <div className="space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row md:items-end md:space-x-4">
                <div className="w-full md:w-2/5 mb-4 md:mb-0">
                  <label htmlFor="fillPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                    Fill Percentage: {fillPercentage}%
                  </label>
                  <input
                    type="range"
                    id="fillPercentage"
                    name="fillPercentage"
                    min="0"
                    max="100"
                    value={fillPercentage}
                    onChange={(e) => setFillPercentage(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="w-full md:w-2/5 mb-4 md:mb-0">
                  <label htmlFor="truckCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                    Truck Capacity
                  </label>
                  <input
                    type="number"
                    id="truckCapacity"
                    name="truckCapacity"
                    value={truckCapacity}
                    onChange={(e) => setTruckCapacity(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Enter truck capacity"
                    min="1"
                  />
                </div>

                <div className="w-full md:w-1/5">
                  <Button 
                    onClick={calculateRoutes} 
                    disabled={isLoading || emptyStations.length === 0}
                    className="w-full"
                  >
                    Calculate Routes
                  </Button>
                </div>
              </div>

              {routes.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-green-700">Planning Results</h3>
                  {routes.map((route, index) => (
                    <div key={index} className="mt-2">
                      <p className="font-medium text-green-800">Route {index + 1} <span style={{ color: routeColors[index] }}>●</span>:</p>
                      <ul className="list-disc list-inside ml-4 text-gray-700">
                        {route.map((station, idx) => (
                          <li key={idx}>{station.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}