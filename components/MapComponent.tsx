"use client"

import { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, useMap, MapContainerProps, Popup } from 'react-leaflet'
import { RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Station } from '@/types/station'

// Function to create custom icons based on routeColor
const createCustomIcon = (routeColor: string | undefined, online: boolean, freeBikes: number, emptySlots: number) => {
  let color = '#000000' // Color predeterminado (negro)

  if (routeColor && routeColor.length > 0) {
    color = routeColor // Usar el color de ruta si está disponible
  } else if (online) {
    if (freeBikes === 0) {
      color = '#ff0000' // Rojo para estaciones vacías
    } else if (emptySlots === 0) {
      color = '#FFA500' // Naranja para estaciones llenas
    } else {
      color = '#00FF00' // Verde para estaciones disponibles
    }
  }

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 1px solid black;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

type MapComponentProps = {
  filteredStations: Station[];
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
  setMap: (map: L.Map | null) => void;
  onRefresh: () => void;
};

function UpdateMapCenter({ selectedStation }: { selectedStation: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedStation) {
      map.setView([selectedStation.lat, selectedStation.lon], 15);
    } else {
      map.setView([41.3874, 2.1686], 12);
    }
  }, [selectedStation, map]);
  return null;
}

// Component to set map reference
function SetMap({ setMap }: { setMap: (map: L.Map) => void }) {
  const map = useMap()

  useEffect(() => {
    setMap(map)
  }, [map, setMap])

  return null
}

export default function MapComponent({ filteredStations, selectedStation, setSelectedStation, setMap, onRefresh }: MapComponentProps & { onRefresh: () => void }) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  useEffect(() => {
    if (filteredStations.length > 0) {
      const latestTimestamp = filteredStations.reduce((latest, station) => {
        const stationTime = new Date(station.last_reported * 1000).getTime()
        return stationTime > latest ? stationTime : latest
      }, 0)

      const latestDate = new Date(latestTimestamp)

      const formattedDate = latestDate.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Madrid'
      })

      setLastUpdateTime(formattedDate)
    }
  }, [filteredStations])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-[-20%] origin-center" style={{ transform: 'rotate(45deg) scale(1.7)' }}>
        <MapContainer
          center={[41.4054458, 2.1663172]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* Component to set map reference */}
          <SetMap setMap={setMap} />
          <UpdateMapCenter selectedStation={selectedStation} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredStations && filteredStations.length > 0 ? (
            filteredStations.map((station) => (
              <Marker
                key={station.station_id}
                position={[station.lat, station.lon]}
                icon={createCustomIcon(
                  station.routeColor,
                  station.status === 'IN_SERVICE',
                  station.num_bikes_available,
                  station.num_docks_available

                )}
                eventHandlers={{
                  click: () => setSelectedStation(station),
                }}
              >

              </Marker>
            ))
          ) : (
            <div>No stations to display</div>
          )}
        </MapContainer>
      </div>
      <div className="absolute bottom-4 right-4 left-4 bg-white bg-opacity-90 p-2 rounded-md text-sm z-[1000] flex justify-between items-center">
        <span>Last update: {lastUpdateTime}</span>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={isRefreshing}
          className="ml-2"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Update'}
        </Button>
      </div>
    </div>
  )
}