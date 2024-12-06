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
    
    const combinedMode = `${newMode}-${newValueMode}`
    setHeatMapMode(combinedMode)
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
            className={`px-3 py-1 border-r border-white ${activeValueMode === 'relative' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors(activeMode, 'relative')}
          >
            Relative
          </button>
          <button 
            className={`px-3 py-1 rounded-r-md ${activeValueMode === 'percentile' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => updateHeatMapColors(activeMode, 'percentile')}
          >
            Percentile
          </button>
        </div>
      </div>
    </div>
  )
} 