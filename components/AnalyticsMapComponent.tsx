import { useEffect, useState, useCallback, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { RefreshCw } from 'lucide-react'
import axios from 'axios'

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

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function MapUpdater({ stations, markersRef, prevStationsRef }: { 
  stations: Station[], 
  markersRef: React.MutableRefObject<{ [key: string]: L.Marker }>,
  prevStationsRef: React.MutableRefObject<{ [key: string]: Station }>
}) {
  const map = useMap();

  useEffect(() => {
    stations.forEach((station) => {
      const prevStation = prevStationsRef.current[station.id]
      let marker = markersRef.current[station.id]
      
      if (!marker) {
        marker = L.marker([station.latitude, station.longitude], {
          icon: createCustomIcon('#000000')
        }).addTo(map)
        markersRef.current[station.id] = marker
      }

      if (prevStation) {
        if (station.free_bikes > prevStation.free_bikes) {
          console.log(`Station ${station.id} increased bikes: ${prevStation.free_bikes} -> ${station.free_bikes}`)
          marker.setIcon(createCustomIcon('#0000FF')) // Azul
          setTimeout(() => marker.setIcon(createCustomIcon('#000000')), 2000) // Negro después de 2 segundos
        } else if (station.free_bikes < prevStation.free_bikes) {
          console.log(`Station ${station.id} decreased bikes: ${prevStation.free_bikes} -> ${station.free_bikes}`)
          marker.setIcon(createCustomIcon('#FF0000')) // Rojo
          setTimeout(() => marker.setIcon(createCustomIcon('#000000')), 2000) // Negro después de 2 segundos
        }
      }

      marker.bindPopup(`
        <div>
          <h3>${station.name}</h3>
          <p>Available bikes: ${station.free_bikes}</p>
          <p>Empty slots: ${station.empty_slots}</p>
        </div>
      `)
    })

    prevStationsRef.current = stations.reduce((acc, station) => {
      acc[station.id] = station
      return acc
    }, {} as { [key: string]: Station })
  }, [stations, map, markersRef, prevStationsRef])

  return null
}

export default function AnalyticsMapComponent() {
  const [stations, setStations] = useState<Station[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const markersRef = useRef<{ [key: string]: L.Marker }>({})
  const prevStationsRef = useRef<{ [key: string]: Station }>({})

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const timestamp = new Date().getTime()
      const response = await axios.get(`/api/bicing?t=${timestamp}`)
      const newStations = response.data.network.stations
      console.log('Fetched stations:', newStations.length)
      setStations(prevStations => {
        newStations.forEach((newStation: Station) => {
          const prevStation = prevStations.find(s => s.id === newStation.id)
          if (prevStation) {
            if (newStation.free_bikes !== prevStation.free_bikes) {
              console.log(`Station ${newStation.id} changed: ${prevStation.free_bikes} -> ${newStation.free_bikes}`)
            }
          }
        })
        return newStations
      })
      setLastUpdateTime(new Date().toLocaleString())
    } catch (error) {
      console.error('Error fetching Bicing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData() // Fetch inicial
    const interval = setInterval(fetchData, 2000) // Actualizar cada 2 segundos
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[41.3874, 2.1686]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater stations={stations} markersRef={markersRef} prevStationsRef={prevStationsRef} />
      </MapContainer>
      <div className="absolute bottom-4 right-4 left-4 bg-white bg-opacity-90 p-2 rounded-md text-sm z-[1000] flex justify-between items-center">
        <span>Last update: {lastUpdateTime}</span>
        <span className={`ml-2 ${isRefreshing ? 'animate-spin' : ''}`}>
          <RefreshCw className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}