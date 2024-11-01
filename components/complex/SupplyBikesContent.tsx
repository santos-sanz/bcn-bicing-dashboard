"use client"

import { Station } from '@/types/station'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

interface SupplyBikesContentProps {
  emptyStations: Station[]
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

export function SupplyBikesContent({
  emptyStations,
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
  calculateRoutes
}: SupplyBikesContentProps) {
  return (
    <CardContent>
      {/* Contador de estaciones vacías */}
      <div className="text-2xl font-semibold text-center mb-4">
        Empty Stations: <span className="text-red-600">{emptyStations.length}</span>
      </div>

      {/* Mapa */}
      <div className="h-[600px] mb-6">
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

      {/* Información de la estación seleccionada */}
      {selectedStation && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow mb-6">
          <h3 className="font-semibold text-lg text-gray-800 mb-2">{selectedStation.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <span className="text-red-600">
              Available bikes: {selectedStation.num_bikes_available}
            </span>
            <span className="text-gray-600">
              Empty docks: {selectedStation.num_docks_available}
            </span>
            <span className="text-gray-600">Status: {selectedStation.status}</span>
            <span className="text-gray-600">Last update: {new Date(selectedStation.last_reported * 1000).toLocaleString('en-US', {
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

      {/* Controles de planificación */}
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
            {routes.map((route, index) => {
              let bikesDelivered = 0;
              return (
                <div key={index} className="mt-2">
                  <p className="font-medium text-green-800">
                    Route {index + 1} <span style={{ color: routeColors[index] }}>●</span>:
                  </p>
                  <ul className="list-disc list-inside ml-4 text-gray-700">
                    {route.map((station, idx) => {
                      const bikesNeeded = Math.ceil((fillPercentage / 100) * (station.num_bikes_available + station.num_docks_available) - station.num_bikes_available);
                      const bikesForThisStation = Math.min(
                        bikesNeeded,
                        truckCapacity - bikesDelivered
                      );
                      bikesDelivered += bikesForThisStation;
                      return (
                        <li key={idx}>
                          {station.name}
                          <span> </span>  
                          <span className="font-semibold">
                             + {bikesForThisStation} bikes
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CardContent>
  )
}
