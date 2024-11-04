import { Station } from '@/types/station'
import { useState } from 'react'

interface HeatMapControlsProps {
  heatMapMode: string
  setHeatMapMode: (mode: string) => void
  filteredStations: Station[]
  setFilteredStations: (stations: Station[]) => void
}

export function HeatMapControls({ 
  heatMapMode, 
  setHeatMapMode,
  filteredStations,
  setFilteredStations 
}: HeatMapControlsProps) {
  const [activeMode, setActiveMode] = useState(heatMapMode)
  const [activeValueMode, setActiveValueMode] = useState('absolute')

  const updateHeatMapColors = (newMode: string, newValueMode = activeValueMode) => {
    setActiveMode(newMode)
    setActiveValueMode(newValueMode)
    
    setHeatMapMode(newMode)
    
    const updatedStations = filteredStations.map(station => ({
      ...station,
      routeColor: (() => {
        const maxBikes = Math.max(...filteredStations.map(s => s.num_bikes_available || 0))
        const relativeValue = maxBikes > 0 ? (station.num_bikes_available || 0) / maxBikes : 0

        switch (newMode) {
          case 'all':
            return newValueMode === 'absolute'
              ? `hsl(${(station.num_bikes_available || 0) * 120 / 30}, 70%, 50%)`
              : `hsl(${relativeValue * 120}, 70%, 50%)`
          case 'in':
            return `hsl(200, 70%, 50%)`
          case 'out':
            return `hsl(0, 70%, 50%)`
          default:
            return '#3b82f6'
        }
      })()
    }))

    setFilteredStations(updatedStations)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center sm:justify-start items-center gap-4">
        <div className="h-6 w-px bg-gray-300" />
        <div className="flex">
          <button 
            className={`px-3 py-1 rounded-l-md border-r border-white ${activeMode === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors('all')}
          >
            All
          </button>
          <button 
            className={`px-3 py-1 border-r border-white ${activeMode === 'in' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors('in')}
          >
            In
          </button>
          <button 
            className={`px-3 py-1 rounded-r-md ${activeMode === 'out' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors('out')}
          >
            Out
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex">
          <button 
            className={`px-3 py-1 rounded-l-md border-r border-white ${activeValueMode === 'absolute' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors(activeMode, 'absolute')}
          >
            Absolute
          </button>
          <button 
            className={`px-3 py-1 rounded-r-md ${activeValueMode === 'relative' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors(activeMode, 'relative')}
          >
            Relative
          </button>
        </div>
      </div>
    </div>
  )
} 