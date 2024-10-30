import React, { useState, useEffect, useCallback } from 'react'
import { Station } from '@/types/station'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from 'next/dynamic'
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface DisabledBikesContentProps {
  disabledStations: Station[]
  isLoading: boolean
  error: string | null
  selectedStation: Station | null
  setSelectedStation: (station: Station | null) => void
  handleRefresh: () => void
  fillPercentage: number
  setFillPercentage: (value: number) => void
  truckCapacity: number
  setTruckCapacity: (value: number) => void
  routes: Station[][]
  routeColors: string[]
  calculateRoutes: () => void
}

export const DisabledBikesContent: React.FC<DisabledBikesContentProps> = ({
  disabledStations,
  isLoading,
  error,
  selectedStation,
  setSelectedStation,
  handleRefresh,
  fillPercentage,
  setFillPercentage,
  truckCapacity,
  setTruckCapacity,
  routes,
  routeColors,
  calculateRoutes,
}) => {
  const [map, setMap] = useState<any | null>(null)

  const handleMapRefresh = useCallback(() => {
    handleRefresh()
  }, [handleRefresh])

  const handleCalculateRoutes = useCallback(() => {
    calculateRoutes()
  }, [calculateRoutes])

  // Calculate the total number of disabled bikes and disabled stations
  const totalDisabledBikes = disabledStations.reduce((acc, station) => acc + station.num_bikes_disabled, 0)
  const numberOfDisabledStations = disabledStations.length

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Aquí está el código que utiliza `window`
      // Por ejemplo:
      // window.addEventListener('resize', handleResize)
    }

    return () => {
      if (typeof window !== 'undefined') {
        // Limpia los event listeners si es necesario
        // window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {error && (
        <Card className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </Card>
      )}

      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Configuration</CardTitle>
        </CardHeader>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Fill Percentage ({fillPercentage}%)
            </label>
            <Slider
              value={[fillPercentage]}
              onValueChange={(value) => setFillPercentage(value[0])}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Truck Capacity ({truckCapacity} bikes)
            </label>
            <Slider
              value={[truckCapacity]}
              onValueChange={(value) => setTruckCapacity(value[0])}
              min={1}
              max={40}
              step={1}
            />
          </div>
          <Button 
            onClick={handleCalculateRoutes}
            className="w-full"
            disabled={isLoading}
          >
            Calculate Routes
          </Button>
        </div>
      </Card>

      <Card className="bg-white shadow-lg">
        <div className="h-[500px] relative">
          <MapComponent
            filteredStations={disabledStations}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
                // Start of Selection
                setMap={setMap}
                onRefresh={handleMapRefresh}
              />
            </div>
          </Card>

      {/* Counters and Buttons below the map */}
      <Card className="bg-white shadow-lg p-4 flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold">Total Disabled Stations: {numberOfDisabledStations}</p>
          <p className="text-lg font-semibold">Total Disabled Bikes: {totalDisabledBikes}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleMapRefresh} disabled={isLoading}>
            Refresh Map
          </Button>
          <Button onClick={handleCalculateRoutes} disabled={isLoading}>
            Calculate Routes
          </Button>
        </div>
      </Card>

      {selectedStation && (
        <Card className="bg-white shadow-lg p-4">
          <CardHeader>
            <CardTitle className="text-xl">Selected Station Details</CardTitle>
          </CardHeader>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Name:</p>
              <p>{selectedStation.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Disabled Bikes:</p>
              <p>{selectedStation.num_bikes_disabled}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Empty Slots:</p>
              <p>{selectedStation.empty_slots}</p>
            </div>
          </div>
        </Card>
      )}

      {routes.length > 0 && (
        <Card className="bg-white shadow-lg p-4">
          <CardHeader>
            <CardTitle className="text-xl">Route Information</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-2">
            {routes.map((route, index) => (
              <Card key={index} className="bg-gray-50 p-2 rounded">
                <p className="font-medium" style={{ color: routeColors[index] }}>
                  Route {index + 1}:
                </p>
                <div className="ml-4">
                  {route.map((station, stationIndex) => (
                    <p key={stationIndex}>
                      {station.name} - {station.num_bikes_disabled} disabled bikes
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
} 