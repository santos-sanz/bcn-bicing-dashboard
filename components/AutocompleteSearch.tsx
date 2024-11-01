"use client"

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Station } from '@/types/station'

interface AutocompleteSearchProps {
  onSelect: (station: Station | null) => void
  bikeStations: Station[]
  setFilteredStations: React.Dispatch<React.SetStateAction<Station[]>>
  updateMetrics: (stations: Station[]) => void
}

export const AutocompleteSearch = ({ onSelect, bikeStations, setFilteredStations, updateMetrics }: AutocompleteSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<(Station | { type: 'post_code' | 'suburb' | 'district', value: string | undefined, label?: string })[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowerTerm = searchTerm.toLowerCase()
      const stationMatches = bikeStations
        .filter(station => station.name.toLowerCase().includes(lowerTerm))
        .slice(0, 10) 

      const postCodeMatches = Array.from(new Set(bikeStations.map(station => station.post_code)))
        .filter(post_code => post_code && post_code.toLowerCase().includes(lowerTerm))
        .map(post_code => ({ type: 'post_code' as const, value: post_code, label: `P-${post_code}` }))
      
      const suburbMatches = Array.from(new Set(bikeStations.map(station => station.suburb)))
        .filter(suburb => suburb && suburb.toLowerCase().includes(lowerTerm))
        .map(suburb => ({ type: 'suburb' as const, value: suburb, label: `S-${suburb}` }))
  
      const districtMatches = Array.from(new Set(bikeStations.map(station => station.district)))
        .filter(district => district && district.toLowerCase().includes(lowerTerm))
        .map(district => ({ type: 'district' as const, value: district, label: `D-${district}` }))
  
      const combinedSuggestions = [
        ...stationMatches,
        ...postCodeMatches,
        ...suburbMatches,
        ...districtMatches
      ]
  
      setSuggestions(combinedSuggestions)
      setIsOpen(true)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [searchTerm, bikeStations])

  const handleSelect = (item: Station | { type: 'post_code' | 'suburb' | 'district', value: string | undefined, label?: string }) => {
    if ('type' in item) {
      setSearchTerm(item.label || '')
      setIsOpen(false)
      
      let filtered: Station[] = []
      switch(item.type) {
        case 'post_code':
          filtered = bikeStations.filter(station => station.post_code === item.value)
          break
        case 'suburb':
          filtered = bikeStations.filter(station => station.suburb === item.value)
          break
        case 'district':
          filtered = bikeStations.filter(station => station.district === item.value)
          break
      }
      onSelect(null)
      setFilteredStations(filtered)
      updateMetrics(filtered)
    } else {
      if ('name' in item) {
        setSearchTerm(item.name)
        setIsOpen(false)
        onSelect(item as Station)
      }
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    setIsOpen(false)
    onSelect(null)
    setFilteredStations(bikeStations)
    updateMetrics(bikeStations)
    inputRef.current?.focus()
  }

  return (
    <div className="relative z-20 w-full sm:w-64">
      <div className="flex items-center">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-0 mr-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto">
          {suggestions.map((item, index) => (
            <li
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(item)}
            >
              {'type' in item ? item.label : item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 