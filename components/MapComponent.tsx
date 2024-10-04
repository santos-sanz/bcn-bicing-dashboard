import { useEffect, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'

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
    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
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
};

function UpdateMapCenter({ selectedStation }: { selectedStation: Station | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedStation) {
      map.setView([selectedStation.latitude, selectedStation.longitude], 15);
    } else {
      map.setView([41.3874, 2.1686], 13);
    }
  }, [selectedStation, map]);
  return null;
}

export default function MapComponent({ filteredStations, selectedStation, setSelectedStation, setMap }: MapComponentProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')

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

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[41.3874, 2.1686]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenReady={handleMapReady}
      >
        <UpdateMapCenter selectedStation={selectedStation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
              <div>
                <h3>{station.name}</h3>
                <p>Available bikes: {station.free_bikes}</p>
                <p>Normal bikes: {station.extra.normal_bikes}</p>
                <p>E-bikes: {station.extra.ebikes}</p>
                <p>Empty slots: {station.empty_slots}</p>
                <p>Status: {station.extra.online ? 'Online' : 'Offline'}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {lastUpdateTime && (
        <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 p-2 m-2 rounded-md text-sm z-[1000] text-center">
          Última actualización: {lastUpdateTime}
        </div>
      )}
    </div>
  )
}