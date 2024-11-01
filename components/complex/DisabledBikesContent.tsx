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

  const totalDisabledBikes = disabledStations.reduce((acc, station) => acc + station.num_bikes_disabled, 0)
  const numberOfDisabledStations = disabledStations.length

  useEffect(() => {
    if (typeof window !== 'undefined') {
    }
    return () => {
      if (typeof window !== 'undefined') {
      }
    }
  }, [])

  return (
    <div className="space-y-6 p-6">
      {error && (
        <Card className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </Card>
      )}

      <div className="text-2xl font-semibold text-center mb-4">
        <div>Stations with Disabled Bikes: <span className="text-gray-600">{numberOfDisabledStations}</span></div>
        <div>Disabled Bikes: <span className="text-gray-600">{totalDisabledBikes}</span></div>
      </div>

      <Card className="bg-white shadow-lg">
        <div className="h-[500px] relative">
          <MapComponent
            filteredStations={disabledStations}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
            setMap={setMap}
            onRefresh={handleMapRefresh}
          />
        </div>
      </Card>

      
      <div className="space-y-4 md:space-y-0"> 
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 md:justify-end">
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
              onClick={handleCalculateRoutes} 
              disabled={isLoading}
              className="w-full"
            >
              Calculate Routes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}