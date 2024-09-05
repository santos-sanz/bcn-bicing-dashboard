import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'


// Solución alternativa para el ícono de Leaflet en webpack
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  // iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  iconUrl: '/icon/bike.svg',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
})

const createCustomIcon = (status: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="marker-pin bg-${status}-500"></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  })
}

export default function MapComponent({ filteredStations, selectedStation, setSelectedStation, setMap }: { filteredStations: any[], selectedStation: any, setSelectedStation: any, setMap: any }) {
  useEffect(() => {
    // Cualquier efecto necesario para el mapa
  }, [])

  return (
    <MapContainer
      center={[41.3874, 2.1686]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      whenReady={setMap}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {filteredStations.map((station: any) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={createCustomIcon(station.status)} 
        >
          <Popup>
            <h3 className="font-semibold">{station.name}</h3>
            <p>Zone: {station.zone}</p>
            <p>Status: {station.status}</p>
            <p>Available Bikes: {station.bikes}</p>
            <p>Available Docks: {station.docks}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}