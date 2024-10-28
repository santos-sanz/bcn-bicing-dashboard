"use client"

import { Station } from '@/components/MapComponent'
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

interface SupplyBikesContentProps {
  emptyStations: Station[]
  isLoading: boolean
  error: string | null
  selectedStation: Station | null
  setSelectedStation: (station: Station | null) => void
  handleRefresh: () => void
  fillPercentage: number
  setFillPercentage: (value: number) => void
  truckCapacity: number
  setTruckCapacity: (value: number) => void
  routes: Station[][]
  routeColors: string[]
  calculateRoutes: () => void
}

export function SupplyBikesContent({
  emptyStations,
  isLoading,
  error,
  selectedStation,
  setSelectedStation,
  handleRefresh,
  fillPercentage,
  setFillPercentage,
  truckCapacity,
  setTruckCapacity,
  routes,
  routeColors,
  calculateRoutes
}: SupplyBikesContentProps) {
  return (
    <CardContent>
      {/* ... contenido existente ... */}
    </CardContent>
  )
}
