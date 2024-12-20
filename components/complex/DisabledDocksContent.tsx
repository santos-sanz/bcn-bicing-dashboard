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

interface DisabledDocksContentProps {
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

const getStationColor = (station: Station): string => {
  const disabledDocks = station.num_docks_disabled || 0;
  
  if (station.status === 'IN_SERVICE') {
    if (disabledDocks >= 5) {
      return '#ff0000' // Rojo para 5 o más docks deshabilitados
    } else if (disabledDocks >= 2) {
      return '#FFA500' // Naranja para 2-4 docks deshabilitados
    } else if (disabledDocks === 1) {
      return '#FFFF00' // Amarillo para 1 dock deshabilitado
    }
  }
  
  return '#000000' // Negro para estaciones fuera de servicio
}

export const DisabledDocksContent: React.FC<DisabledDocksContentProps> = ({
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

  const totalDisabledDocks = disabledStations.reduce((acc, station) => acc + (station.num_docks_disabled || 0), 0)
  const numberOfDisabledStations = disabledStations.length

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Aquí podrías añadir lógica adicional si es necesario
    }
    return () => {
      if (typeof window !== 'undefined') {
        // Limpieza si es necesario
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
      <div>Station with Disabled Docks: <span className="text-gray-600">{numberOfDisabledStations}</span></div>
        <div>Disabled Docks: <span className="text-gray-600">{totalDisabledDocks}</span></div>
      </div>

      <div className="text-sm text-gray-500 text-center"> {/* Centrado*/}
        <div>Legend: <span className="text-yellow-500">1 dock disabled</span>, <span className="text-orange-500">2-4 docks disabled</span>, <span className="text-red-500">5 or more docks disabled</span></div>
      </div>

      <Card className="bg-white shadow-lg">
        <div className="h-[500px] relative">
          <MapComponent
            filteredStations={disabledStations}
            selectedStation={selectedStation}
            setSelectedStation={setSelectedStation}
            setMap={setMap}
            onRefresh={handleMapRefresh}
            getStationColor={getStationColor}
          />
        </div>
      </Card>

      {selectedStation && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow mb-6">
          <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedStation.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <span className="text-red-600">
              Disabled docks: {selectedStation.num_docks_disabled}
            </span>
            <span className="text-gray-600">
              Available docks: {selectedStation.num_docks_available}
            </span>
            <span className="text-gray-600">Status: {selectedStation.status}</span>
            <span className="text-gray-600">Last update: {new Date(selectedStation.last_reported * 1000).toLocaleString('es-ES', {
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
    </div>
  )
}