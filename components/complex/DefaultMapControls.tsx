import { Station } from '@/types/station'
import { useEffect, useState } from 'react'

interface DefaultMapControlsProps {
  filter: string
  setFilter: (filter: string) => void
  filteredStations: Station[]
  setFilteredStations: (stations: Station[]) => void
}

export function DefaultMapControls({ 
  filter, 
  setFilter, 
  filteredStations,
  setFilteredStations 
}: DefaultMapControlsProps) {
  const hashString = (str: string): number => {
    let hash = 0
    for (let i = 0; i < str?.length || 0; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  // Mapa de colores predefinidos para códigos postales
  const postcodeColors: { [key: string]: string } = {
    '08001': '#FF0000', // Rojo
    '08002': '#00FF00', // Verde
    '08003': '#0000FF', // Azul
    '08004': '#FFFF00', // Amarillo
    '08005': '#FF00FF', // Magenta
    '08006': '#00FFFF', // Cian
    '08007': '#FFA500', // Naranja
    '08008': '#800080', // Púrpura
    '08009': '#008000', // Verde oscuro
    '08010': '#000080', // Azul marino
    '08011': '#FFC0CB', // Rosa
    '08012': '#800000', // Marrón
    '08013': '#808000', // Oliva
    '08014': '#008080', // Verde azulado
    '08015': '#FFD700', // Dorado
    '08016': '#4B0082', // Índigo
    '08017': '#FF4500', // Naranja rojizo
    '08018': '#DA70D6', // Orquídea
    '08019': '#FA8072', // Salmón
    '08020': '#20B2AA', // Verde mar claro
    '08021': '#FF69B4', // Rosa intenso
    '08022': '#CD853F', // Marrón Perú
    '08023': '#DDA0DD', // Ciruela
    '08024': '#F0E68C', // Caqui
    '08025': '#48D1CC', // Turquesa medio
    '08026': '#C71585', // Violeta medio
    '08027': '#FFB6C1', // Rosa claro
    '08028': '#00FA9A', // Verde primavera medio
    '08029': '#4682B4', // Azul acero
    '08030': '#D2691E', // Chocolate
  }

  // Estado local para el filtro activo
  const [activeFilter, setActiveFilter] = useState('city')

  // Aplicar el filtro inicial al montar el componente
  useEffect(() => {
    updateMarkerColors('city')
  }, []) // Solo se ejecuta al montar el componente

  const updateMarkerColors = (newFilter: string) => {
    // Actualizar estado local inmediatamente
    setActiveFilter(newFilter)
    // Actualizar estado padre
    setFilter(newFilter)
    
    const updatedStations = filteredStations.map(station => ({
      ...station,
      routeColor: (() => {
        switch (newFilter) {
          case 'city':
            return '#3b82f6'
          case 'district':
            return `hsl(${hashString(station.district || '') % 360}, 70%, 50%)`
          case 'suburb':
            return `hsl(${hashString(station.suburb || '') % 360}, 70%, 50%)`
          case 'postcode':
            return postcodeColors[station.post_code || ''] || '#3b82f6'
          default:
            return '#3b82f6'
        }
      })()
    }))

    setFilteredStations(updatedStations)
  }

  return (
    <div className="flex justify-center sm:justify-start">
      <div className="flex overflow-hidden rounded-md">
        <button 
          className={`px-3 py-1 ${activeFilter === 'city' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => updateMarkerColors('city')}
        >
          City
        </button>
        <button 
          className={`px-3 py-1 border-l border-white ${activeFilter === 'district' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => updateMarkerColors('district')}
        >
          District
        </button>
        <button 
          className={`px-3 py-1 border-l border-white ${activeFilter === 'suburb' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => updateMarkerColors('suburb')}
        >
          Suburb
        </button>
        <button 
          className={`px-3 py-1 border-l border-white ${activeFilter === 'postcode' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => updateMarkerColors('postcode')}
        >
          PostCode
        </button>
      </div>
    </div>
  )
} 