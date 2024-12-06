"use client"

import { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, useMap, MapContainerProps, Popup } from 'react-leaflet'
import { RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Station } from '@/types/station'

type MapComponentProps = {
  filteredStations: Station[];
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
  setMap: (map: L.Map | null) => void;
  onRefresh: () => void;
  getStationColor: (station: Station) => string;
  showUpdateBar?: boolean;
  defaultCenter?: [number, number];
  defaultZoom?: number;
};

const DEFAULT_CENTER: [number, number] = [41.3874, 2.1686];
const DEFAULT_ZOOM = 13;

function UpdateMapCenter({ 
  selectedStation,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM 
}: { 
  selectedStation: Station | null;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    try {
      if (selectedStation?.lat && selectedStation?.lon) {
        const lat = typeof selectedStation.lat === 'string' ? parseFloat(selectedStation.lat) : selectedStation.lat;
        const lon = typeof selectedStation.lon === 'string' ? parseFloat(selectedStation.lon) : selectedStation.lon;
        
        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          map.setView([lat, lon], 15);
          return;
        }
      }
      
      // If no valid selected station, use default center
      map.setView(defaultCenter, defaultZoom);
    } catch (error) {
      console.error('Error updating map center:', error);
      // Fallback to default center if there's an error
      map.setView(defaultCenter, defaultZoom);
    }
  }, [selectedStation, map, defaultCenter, defaultZoom]);
  
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

export default function MapComponent({ 
  filteredStations, 
  selectedStation, 
  setSelectedStation, 
  setMap, 
  onRefresh, 
  getStationColor,
  showUpdateBar = true,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM
}: MapComponentProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    console.log('Filtered stations count:', filteredStations.length);
    if (filteredStations.length > 0) {
      console.log('Sample station:', {
        id: filteredStations[0].station_id,
        lat: filteredStations[0].lat,
        lon: filteredStations[0].lon
      });
    }
  }, [filteredStations]);

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
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <SetMap setMap={setMap} />
          <UpdateMapCenter 
            selectedStation={selectedStation} 
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredStations && filteredStations.length > 0 ? (
            filteredStations.map((station) => {
              // Validate station coordinates
              const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
              const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
              
              if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
                console.warn('Invalid coordinates for station:', station);
                return null;
              }

              return (
                <Marker
                  key={station.station_id}
                  position={[lat, lon]}
                  icon={L.divIcon({
                    className: 'custom-icon',
                    html: `<div style="background-color: ${getStationColor(station)}; width: 10px; height: 10px; border-radius: 50%; border: 1px solid black;"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                  })}
                  eventHandlers={{
                    click: () => setSelectedStation(station),
                  }}
                />
              );
            })
          ) : (
            <div>No stations to display</div>
          )}
        </MapContainer>
      </div>
      {showUpdateBar && (
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
      )}
    </div>
  )
}