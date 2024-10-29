"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Station } from '@/components/MapComponent'
import { SupplyBikesContent } from '@/components/complex/SupplyBikesContent'
import { ReallocateBikesContent } from '@/components/complex/ReallocateBikesContent'

export default function TasksPage() {
  // Estados compartidos
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para Supply Bikes
  const [emptyStations, setEmptyStations] = useState<Station[]>([])
  const [selectedSupplyStation, setSelectedSupplyStation] = useState<Station | null>(null)
  const [supplyRoutes, setSupplyRoutes] = useState<Station[][]>([])
  const [supplyRouteColors, setSupplyRouteColors] = useState<string[]>([])
  const [supplyFillPercentage, setSupplyFillPercentage] = useState<number>(20)
  const [supplyTruckCapacity, setSupplyTruckCapacity] = useState<number>(20)
  const [isPlanningExpanded, setIsPlanningExpanded] = useState(false)
  
  // Estados para Reallocate Bikes
  const [fullStations, setFullStations] = useState<Station[]>([])
  const [reallocationEmptyStations, setReallocationEmptyStations] = useState<Station[]>([])
  const [selectedReallocationStation, setSelectedReallocationStation] = useState<Station | null>(null)
  const [reallocationRoutes, setReallocationRoutes] = useState<Station[][]>([])
  const [reallocationRouteColors, setReallocationRouteColors] = useState<string[]>([])
  const [reallocationFillPercentage, setReallocationFillPercentage] = useState<number>(20)
  const [reallocationTruckCapacity, setReallocationTruckCapacity] = useState<number>(20)
  const [isReallocationExpanded, setIsReallocationExpanded] = useState(false)

  // Añadir estados para los iconos
  const [supplyIcons, setSupplyIcons] = useState<{ [key: string]: any }>({})
  const [reallocationIcons, setReallocationIcons] = useState<{ [key: string]: any }>({})

  const fetchStations = async () => { 
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/bicing')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Received data is not an array')
      }

      const formattedStations: Station[] = data.map((station: any) => ({
        ...station,
        name: station.name.replace(/\s*[\(\+\-\)]+\s*$/, ''),
        extra: {
          ...station.extra,
          online: station.extra.status === "OPEN",
          routeColor: station.free_bikes === 0 ? '#FF0000' : 
                     station.empty_slots === 0 ? '#0000FF' : 
                     undefined
        }
      }))

      const empty = formattedStations.filter((station: Station) => station.free_bikes === 0)
      const full = formattedStations.filter((station: Station) => station.empty_slots === 0)

      setEmptyStations(empty)
      setFullStations(full)
      setReallocationEmptyStations(empty) // Copia separada para reallocation
    } catch (error) {
      console.error('Error fetching stations:', error)
      setError(`Error loading stations: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setEmptyStations([])
      setFullStations([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStations()
  }, [])

  const handleSupplyRefresh = () => {
    fetchStations()
    setSupplyRoutes([])
    setSupplyRouteColors([])
    setSelectedSupplyStation(null)
  }

  const handleReallocationRefresh = () => {
    fetchStations()
    setReallocationRoutes([])
    setReallocationRouteColors([])
    setSelectedReallocationStation(null)
  }

  const colorPalette = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
    '#33FFF3', '#FFC300', '#FF8C33', '#8DFF33', '#33FF8C',
    '#FF33F5', '#33FFCC', '#FF5733', '#33A1FF', '#FFD700',
    '#4B0082', '#00CED1', '#FF1493', '#32CD32', '#8A2BE2'
  ];

  const calculateRoutes = () => {
    if (supplyTruckCapacity <= 0) {
      alert("Truck capacity must be greater than 0.")
      return
    }

    let totalBikesNeeded = 0
    const stationsNeedingBikes = emptyStations.map(station => {
      const desiredBikes = Math.ceil((supplyFillPercentage / 100) * (station.free_bikes + station.empty_slots))
      const bikesNeeded = desiredBikes - station.free_bikes
      return { ...station, bikesNeeded: bikesNeeded > 0 ? bikesNeeded : 0 }
    }).filter(station => station.bikesNeeded > 0)

    totalBikesNeeded = stationsNeedingBikes.reduce((acc, station) => acc + station.bikesNeeded, 0)

    const routesNeeded = Math.ceil(totalBikesNeeded / supplyTruckCapacity)

    const assignedRouteColors = colorPalette.slice(0, routesNeeded)
    setSupplyRouteColors(assignedRouteColors) // Cambiar a supplyRouteColors

    // Función para calcular la distancia entre dos puntos
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371 // Radio de la Tierra en km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c // Distancia en km
    }

    // Algoritmo de agrupación basado en proximidad
    const assignedRoutes: Station[][] = []
    let remainingStations = [...stationsNeedingBikes]

    while (remainingStations.length > 0) {
      const route: Station[] = [remainingStations[0]]
      let currentBikes = remainingStations[0].bikesNeeded
      remainingStations = remainingStations.slice(1)

      while (currentBikes < supplyTruckCapacity && remainingStations.length > 0) {
        // Encontrar la estación más cercana
        let nearestIndex = 0
        let nearestDistance = Infinity
        for (let i = 0; i < remainingStations.length; i++) {
          const distance = calculateDistance(
            route[route.length - 1].latitude, route[route.length - 1].longitude,
            remainingStations[i].latitude, remainingStations[i].longitude
          )
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const nextStation = remainingStations[nearestIndex]
        if (currentBikes + nextStation.bikesNeeded <= supplyTruckCapacity) {
          route.push(nextStation)
          currentBikes += nextStation.bikesNeeded
          remainingStations.splice(nearestIndex, 1)
        } else {
          break
        }
      }

      assignedRoutes.push(route)
    }

    // Remover la creación de iconos de aquí
    const updatedStations = emptyStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.some(routeStation => routeStation.id === station.id)
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : ''
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor
        }
      }
    })

    setEmptyStations(updatedStations)
    setSupplyRoutes(assignedRoutes)
    setSupplyRouteColors(assignedRouteColors)
  }

  // Añadir función para calcular rutas de relocalización
  const calculateReallocationRoutes = () => {
    if (reallocationTruckCapacity <= 0) {
      alert("Truck capacity must be greater than 0.")
      return
    }

    // Calcular bicicletas disponibles para mover desde estaciones llenas
    const stationsWithExcessBikes = fullStations.map(station => {
      const targetBikes = Math.ceil((reallocationFillPercentage / 100) * (station.free_bikes + station.empty_slots))
      const excessBikes = station.free_bikes - targetBikes
      return { ...station, excessBikes: excessBikes > 0 ? excessBikes : 0 }
    }).filter(station => station.excessBikes > 0)

    // Calcular bicicletas necesarias en estaciones vacías
    const stationsNeedingBikes = reallocationEmptyStations.map(station => {
      const targetBikes = Math.ceil((reallocationFillPercentage / 100) * (station.free_bikes + station.empty_slots))
      const bikesNeeded = targetBikes - station.free_bikes
      return { ...station, bikesNeeded: bikesNeeded > 0 ? bikesNeeded : 0 }
    }).filter(station => station.bikesNeeded > 0)

    // Función para calcular la distancia entre dos puntos
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371 // Radio de la Tierra en km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c // Distancia en km
    }

    // Crear rutas que conecten estaciones llenas con vacías
    const assignedRoutes: Station[][] = []
    let remainingFullStations = [...stationsWithExcessBikes]
    let remainingEmptyStations = [...stationsNeedingBikes]

    while (remainingFullStations.length > 0 && remainingEmptyStations.length > 0) {
      const route: Station[] = []
      let currentCapacity = reallocationTruckCapacity

      // Comenzar con una estación llena
      const sourceStation = remainingFullStations[0]
      route.push(sourceStation)
      const bikesToCollect = Math.min(sourceStation.excessBikes, currentCapacity)
      currentCapacity = bikesToCollect

      remainingFullStations = remainingFullStations.slice(1)

      // Encontrar estaciones vacías cercanas para distribuir las bicicletas
      while (currentCapacity > 0 && remainingEmptyStations.length > 0) {
        // Encontrar la estación vacía más cercana
        let nearestIndex = 0
        let nearestDistance = Infinity
        
        for (let i = 0; i < remainingEmptyStations.length; i++) {
          const distance = calculateDistance(
            route[route.length - 1].latitude, route[route.length - 1].longitude,
            remainingEmptyStations[i].latitude, remainingEmptyStations[i].longitude
          )
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const targetStation = remainingEmptyStations[nearestIndex]
        const bikesToDeliver = Math.min(currentCapacity, targetStation.bikesNeeded)
        
        if (bikesToDeliver > 0) {
          route.push(targetStation)
          currentCapacity -= bikesToDeliver
        
          if (bikesToDeliver >= targetStation.bikesNeeded) {
            remainingEmptyStations.splice(nearestIndex, 1)
          } else {
            remainingEmptyStations[nearestIndex] = {
              ...targetStation,
              bikesNeeded: targetStation.bikesNeeded - bikesToDeliver
            }
          }
        } else {
          break
        }
      }

      if (route.length > 1) { // Solo añadir rutas que conecten al menos 2 estaciones
        assignedRoutes.push(route)
      }
    }

    // Asignar colores a las rutas
    const routesNeeded = assignedRoutes.length
    const assignedRouteColors = colorPalette.slice(0, routesNeeded)

    // Actualizar colores y labels de las estaciones según las rutas
    const updatedFullStations = fullStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route[0].id === station.id
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : '#0000FF'
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor
        }
      }
    })

    const updatedEmptyStations = reallocationEmptyStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.slice(1).some(routeStation => routeStation.id === station.id)
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : '#FF0000'
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor
        }
      }
    })

    setFullStations(updatedFullStations)
    setReallocationEmptyStations(updatedEmptyStations)
    setReallocationRoutes(assignedRoutes)
    setReallocationRouteColors(assignedRouteColors)
  }

  // Crear los iconos cuando cambian las rutas
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updatedStations = emptyStations.map(station => {
      const routeIndex = supplyRoutes.findIndex(route => 
        route.some(routeStation => routeStation.id === station.id)
      )
      const routeColor = routeIndex !== -1 ? supplyRouteColors[routeIndex] : ''
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor
        }
      }
    })

    setEmptyStations(updatedStations)
  }, [supplyRoutes, supplyRouteColors, emptyStations])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updatedFullStations = fullStations.map(station => {
      const routeIndex = reallocationRoutes.findIndex(route => 
        route[0].id === station.id
      )
      const routeColor = routeIndex !== -1 ? reallocationRouteColors[routeIndex] : '#0000FF'
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor,
          icon: routeColor
        }
      }
    })

    const updatedEmptyStations = reallocationEmptyStations.map(station => {
      const routeIndex = reallocationRoutes.findIndex(route => 
        route.slice(1).some(routeStation => routeStation.id === station.id)
      )
      const routeColor = routeIndex !== -1 ? reallocationRouteColors[routeIndex] : '#FF0000'
      return {
        ...station,
        extra: {
          ...station.extra,
          routeColor
        }
      }
    })

    setFullStations(updatedFullStations)
    setReallocationEmptyStations(updatedEmptyStations)
  }, [reallocationRoutes, reallocationRouteColors, fullStations, reallocationEmptyStations])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Management Tasks</h1>
      
      <Card className="bg-white shadow-lg mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-gray-800">Supply Bikes</CardTitle>
            <Button
              onClick={() => setIsPlanningExpanded(!isPlanningExpanded)}
              variant="ghost"
              size="sm"
            >
              {isPlanningExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        {isPlanningExpanded && (
          <SupplyBikesContent
            emptyStations={emptyStations}
            isLoading={isLoading}
            error={error}
            selectedStation={selectedSupplyStation}
            setSelectedStation={setSelectedSupplyStation}
            handleRefresh={handleSupplyRefresh}
            fillPercentage={supplyFillPercentage}
            setFillPercentage={setSupplyFillPercentage}
            truckCapacity={supplyTruckCapacity}
            setTruckCapacity={setSupplyTruckCapacity}
            routes={supplyRoutes}
            routeColors={supplyRouteColors}
            calculateRoutes={calculateRoutes}
          />
        )}
      </Card>

      <Card className="bg-white shadow-lg mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-gray-800">Reallocate Bikes</CardTitle>
            <Button
              onClick={() => setIsReallocationExpanded(!isReallocationExpanded)}
              variant="ghost"
              size="sm"
            >
              {isReallocationExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        {isReallocationExpanded && (
          <ReallocateBikesContent
            fullStations={fullStations}
            emptyStations={reallocationEmptyStations}
            isLoading={isLoading}
            error={error}
            selectedStation={selectedReallocationStation}
            setSelectedStation={setSelectedReallocationStation}
            handleRefresh={handleReallocationRefresh}
            fillPercentage={reallocationFillPercentage}
            setFillPercentage={setReallocationFillPercentage}
            truckCapacity={reallocationTruckCapacity}
            setTruckCapacity={setReallocationTruckCapacity}
            routes={reallocationRoutes}
            routeColors={reallocationRouteColors}
            calculateReallocationRoutes={calculateReallocationRoutes}
          />
        )}
      </Card>
    </div>
  )
}
