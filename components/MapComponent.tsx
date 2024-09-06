import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Solución alternativa para el ícono de Leaflet en webpack
(L.Icon.Default as any).mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: '/icon/bike.svg',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
})

const createCustomIcon = (status: string) => {
  const color = status.toLowerCase() === 'green' ? '#00ff00' : 
                status.toLowerCase() === 'yellow' ? '#ffbf00' : 
                status.toLowerCase() === 'red' ? '#ff0000' : '#c30b82';

  const svgIcon = ` 
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path fill="${color}" d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 27 15 27s15-18.716 15-27C30 6.716 23.284 0 15 0z"/>
      <circle fill="white" cx="15" cy="15" r="7"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-icon',
    html: svgIcon,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42]
  });
}

const MapController = ({ setMap }: { setMap: (map: L.Map) => void }) => {
  const map = useMap()
  useEffect(() => {
    setMap(map)
    
    // Ajustar el z-index del contenedor del mapa
    const mapPane = map.getPane('mapPane');
    if (mapPane) {
      mapPane.style.zIndex = '0';
    }
    
    // Ajustar el z-index de los marcadores
    const markerPane = map.getPane('markerPane');
    if (markerPane) {
      markerPane.style.zIndex = '1000';
    }
  }, [map, setMap])
  return null
}

const MapComponent = ({ filteredStations, selectedStation, setSelectedStation, setMap }: { filteredStations: any[], selectedStation: any, setSelectedStation: any, setMap: (map: L.Map) => void }) => {
  return (
    <div className="map-container" style={{ position: 'relative', zIndex: 0, height: '100vh', width: '100%' }}>
      <MapContainer
        center={[41.3874, 2.1686]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <MapController setMap={setMap} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {filteredStations.map((station: any) => {
          console.log('Renderizando estación:', station, 'con estado:', station.status);
          return (
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
          )
        })}
      </MapContainer>
    </div>
  )
}

export default MapComponent