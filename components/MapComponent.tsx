import { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"

const createCustomIcon = (online: boolean, freeBikes: number, emptySlots: number) => {
  let color = '#ffbf00' // Color por defecto (amarillo)
  
  if (online) {
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

type Station = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  free_bikes: number;
  empty_slots: number;
  timestamp: string;
  extra: {
    online: boolean;
    uid: string;
    normal_bikes: number;
    ebikes: number;
  };
};

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
      map.setView([selectedStation.latitude, selectedStation.longitude], 15);
    } else {
      map.setView([41.3874, 2.1686], 12); // Cambiado de 11 a 12 para un zoom in ligero
    }
  }, [selectedStation, map]);
  return null;
}

export default function MapComponent({ filteredStations, selectedStation, setSelectedStation, setMap, onRefresh }: MapComponentProps & { onRefresh: () => void }) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleMapReady = useCallback(() => {
    return (map: L.Map) => {
      setMap(map)
    }
  }, [setMap])

  useEffect(() => {
    if (filteredStations.length > 0) {
      const latestTimestamp = filteredStations.reduce((latest, station) => {
        const stationTime = new Date(station.timestamp).getTime()
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setIsRefreshing(false)
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-[-20%] origin-center" style={{ transform: 'rotate(45deg) scale(1.7)' }}>
        <MapContainer
          center={[41.4054458, 2.1663172]}
          zoom={12} // Cambiado de 11 a 12 para un zoom in ligero
          style={{ height: '100%', width: '100%' }}
          whenReady={handleMapReady}
          zoomControl={false}
          attributionControl={false}
        >
          <UpdateMapCenter selectedStation={selectedStation} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={createCustomIcon(station.extra.online, station.free_bikes, station.empty_slots)}
              eventHandlers={{
                click: () => setSelectedStation(station),
              }}
            >
              <Popup>
                <div style={{ transform: 'rotate(-45deg)', transformOrigin: 'center center' }}>
                  <h3>{station.name}</h3>
                  <p>Bicicletas disponibles: {station.free_bikes}</p>
                  <p>Bicicletas normales: {station.extra.normal_bikes}</p>
                  <p>E-bikes: {station.extra.ebikes}</p>
                  <p>Espacios vacíos: {station.empty_slots}</p>
                  <p>Estado: {station.extra.online ? 'En línea' : 'Fuera de línea'}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="absolute bottom-4 right-4 left-4 bg-white bg-opacity-90 p-2 rounded-md text-sm z-[1000] flex justify-between items-center">
        <span>Última actualización: {lastUpdateTime}</span>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          disabled={isRefreshing}
          className="ml-2"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>
      <div className="absolute bottom-1 right-1 text-xs text-gray-500 z-[1000]">
        © OpenStreetMap contributors
      </div>
    </div>
  )
}