import { Station } from '@/types/station'
import { useState } from 'react'

interface StatusMapControlsProps {
  filter: string
  setFilter: (filter: string) => void
  filteredStations: Station[]
  setFilteredStations: (stations: Station[]) => void
  filterValue: string
}

export function StatusMapControls({ 
  filter, 
  setFilter, 
  filteredStations,
  setFilteredStations,
  filterValue
}: StatusMapControlsProps) {
  const [activeFilter, setActiveFilter] = useState('empty')
  const [activeMode, setActiveMode] = useState('time')

  const updateMarkerColors = (newFilter: string, newMode = activeMode) => {
    setActiveFilter(newFilter)
    setActiveMode(newMode)
    setFilter(`${newFilter}-${newMode}`)
    
    const updatedStations = filteredStations.map(station => ({
      ...station,
      routeColor: newFilter === 'empty' ? '#ef4444' : '#22c55e'
    }))

    setFilteredStations(updatedStations)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center sm:justify-start items-center gap-4">
        <div className="flex overflow-hidden rounded-md">
          <button 
            className={`px-3 py-1 rounded-l-md ${activeFilter === 'empty' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateMarkerColors('empty', activeMode)}
          >
            Empty
          </button>
          <button 
            className={`px-3 py-1 rounded-r-md border-l border-white ${activeFilter === 'full' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateMarkerColors('full', activeMode)}
          >
            Full
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex overflow-hidden rounded-md">
          <button 
            className={`px-3 py-1 rounded-l-md ${activeMode === 'time' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateMarkerColors(activeFilter, 'time')}
          >
            Time %
          </button>
          <button 
            className={`px-3 py-1 rounded-r-md border-l border-white ${activeMode === 'percentile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateMarkerColors(activeFilter, 'percentile')}
          >
            Percentile
          </button>
        </div>
      </div>
    </div>
  )
} 