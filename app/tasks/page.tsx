"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Station } from '@/types/station'
import { SupplyBikesContent } from '@/components/complex/SupplyBikesContent'
import { ReallocateBikesContent } from '@/components/complex/ReallocateBikesContent'
import { DisabledBikesContent } from '@/components/complex/DisabledBikesContent'
import { DisabledDocksContent } from '@/components/complex/DisabledDocksContent'

type StationWithExcess = Station & { excessBikes: number }
type StationWithDelivery = Station & { deliveredBikes: number }

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

  // Estados para Disabled Bikes
  const [disabledBikesStations, setDisabledBikesStations] = useState<Station[]>([])
  const [selectedDisabledBikesStation, setSelectedDisabledBikesStation] = useState<Station | null>(null)
  const [disabledBikesRoutes, setDisabledBikesRoutes] = useState<Station[][]>([])
  const [disabledBikesRouteColors, setDisabledBikesRouteColors] = useState<string[]>([])
  const [disabledBikesFillPercentage, setDisabledBikesFillPercentage] = useState<number>(20)
  const [disabledBikesTruckCapacity, setDisabledBikesTruckCapacity] = useState<number>(20)
  const [isDisabledBikesExpanded, setIsDisabledBikesExpanded] = useState(false)

  // Estados para Disabled Docks
  const [disabledDocksStations, setDisabledDocksStations] = useState<Station[]>([])
  const [selectedDisabledDocksStation, setSelectedDisabledDocksStation] = useState<Station | null>(null)
  const [disabledDocksRoutes, setDisabledDocksRoutes] = useState<Station[][]>([])
  const [disabledDocksRouteColors, setDisabledDocksRouteColors] = useState<string[]>([])
  const [disabledDocksFillPercentage, setDisabledDocksFillPercentage] = useState<number>(20)
  const [disabledDocksTruckCapacity, setDisabledDocksTruckCapacity] = useState<number>(20)
  const [isDisabledDocksExpanded, setIsDisabledDocksExpanded] = useState(false)

  // Añadir nuevo estado para la fecha
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStations = async () => { 
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/bikesystem')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      // Actualizar la fecha
      setLastUpdate(new Date())

      if (!Array.isArray(data)) {
        throw new Error('Received data is not an array')
      }

      const formattedStations: Station[] = data.map((station: any) => ({
        ...station,
        name: station.name.replace(/\s*[\(\+\-\)]+\s*$/, ''),
        extra: {
          ...station.extra,
          online: station.status === "IN_SERVICE",
          routeColor: undefined
        }
      }))

      // Filter stations with at least 1 disabled bike
      const disabled = formattedStations.filter(station => 
        station.num_bikes_disabled > 0
      )

      setDisabledBikesStations(disabled)
      
      // Filtrar estaciones según su estado
      const empty = formattedStations.filter(station => station.num_bikes_available === 0)
      const full = formattedStations.filter(station => station.num_docks_available === 0)

      setEmptyStations(empty)
      setFullStations(full)
      setReallocationEmptyStations(empty)

      // Añadir filtrado para estaciones con docks deshabilitados
      const disabledDocks = formattedStations.filter(station => 
        station.num_docks_disabled > 0
      )
      setDisabledDocksStations(disabledDocks)
    } catch (error) {
      console.error('Error fetching stations:', error)
      setError(`Error loading stations: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setEmptyStations([])
      setFullStations([])
      setDisabledBikesStations([])
      setDisabledDocksStations([])
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

  const colorPalette = useMemo(() => ([
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
    '#33FFF3', '#FFC300', '#FF8C33', '#8DFF33', '#33FF8C',
    '#FF33F5', '#33FFCC', '#FF5733', '#33A1FF', '#FFD700',
    '#4B0082', '#00CED1', '#FF1493', '#32CD32', '#8A2BE2'
  ]), [])

  const calculateRoutes = () => {
    if (supplyTruckCapacity <= 0) {
      alert("Truck capacity must be greater than 0.")
      return
    }

    let totalBikesNeeded = 0
    const stationsNeedingBikes = emptyStations.map(station => {
      const desiredBikes = Math.ceil((supplyFillPercentage / 100) * (station.num_bikes_available + station.num_docks_available))
      const bikesNeeded = desiredBikes - station.num_bikes_available
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
            route[route.length - 1].lat, route[route.length - 1].lon,
            remainingStations[i].lat, remainingStations[i].lon
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
        route.some(routeStation => routeStation.station_id === station.station_id)
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : ''
      return {
        ...station,
        routeColor
      }
    })

    setEmptyStations(updatedStations)
    setSupplyRoutes(assignedRoutes)
    setSupplyRouteColors(assignedRouteColors)
  }

  // Añadir función para calcular rutas de relocalización
  const calculateReallocationRoutes = () => {
    if (reallocationTruckCapacity <= 0) {
      alert("La capacidad del camión debe ser mayor que 0.")
      return
    }

    // Calcular bicicletas disponibles para mover desde estaciones llenas
    const stationsWithExcessBikes = fullStations.map(station => {
      const targetBikes = Math.ceil((reallocationFillPercentage / 100) * (station.num_bikes_available + station.num_docks_available))
      const excessBikes = station.num_bikes_available - targetBikes
      return { ...station, excessBikes: excessBikes > 0 ? excessBikes : 0 }
    }).filter(station => station.excessBikes > 0)

    // Calcular bicicletas necesarias en estaciones vacías
    const stationsNeedingBikes = reallocationEmptyStations.map(station => {
      const targetBikes = Math.ceil((reallocationFillPercentage / 100) * (station.num_bikes_available + station.num_docks_available))
      const bikesNeeded = targetBikes - station.num_bikes_available
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
    const assignedRoutes: { source: Station; targets: { station: Station; bikesToDeliver: number }[] }[] = []
    let remainingFullStations = [...stationsWithExcessBikes]
    let remainingEmptyStations = [...stationsNeedingBikes]

    while (remainingFullStations.length > 0 && remainingEmptyStations.length > 0) {
      const sourceStation = remainingFullStations[0]
      let bikesToMove = sourceStation.excessBikes
      const route: { station: Station; bikesToDeliver: number }[] = []
      remainingFullStations = remainingFullStations.slice(1)

      while (bikesToMove > 0 && remainingEmptyStations.length > 0) {
        // Encontrar la estación vacía más cercana
        let nearestIndex = 0
        let nearestDistance = Infinity
        for (let i = 0; i < remainingEmptyStations.length; i++) {
          const distance = calculateDistance(
            sourceStation.lat, sourceStation.lon,
            remainingEmptyStations[i].lat, remainingEmptyStations[i].lon
          )
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestIndex = i
          }
        }

        const targetStation = remainingEmptyStations[nearestIndex]
        const bikesNeeded = targetStation.bikesNeeded
        const bikesDelivered = Math.min(bikesNeeded, bikesToMove, reallocationTruckCapacity)

        if (bikesDelivered > 0) {
          route.push({ station: targetStation, bikesToDeliver: bikesDelivered })
          bikesToMove -= bikesDelivered

          if (bikesDelivered >= bikesNeeded) {
            remainingEmptyStations.splice(nearestIndex, 1)
          } else {
            remainingEmptyStations[nearestIndex] = {
              ...targetStation,
              bikesNeeded: targetStation.bikesNeeded - bikesDelivered
            }
          }
        } else {
          break
        }
      }

      if (route.length > 0) {
        assignedRoutes.push({ source: sourceStation, targets: route })
      }
    }

    // Asignar colores a las rutas
    const routesNeeded = assignedRoutes.length
    const assignedRouteColors = colorPalette.slice(0, routesNeeded)

    // Actualizar colores y labels de las estaciones según las rutas
    const updatedFullStations = fullStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.source.station_id === station.station_id
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : '#0000FF'
      return {
        ...station,
        routeColor
      }
    })

    const updatedEmptyStations = reallocationEmptyStations.map(station => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.targets.some(target => target.station.station_id === station.station_id)
      )
      const routeColor = routeIndex !== -1 ? assignedRouteColors[routeIndex] : '#FF0000'
      return {
        ...station,
        routeColor
      }
    })

    setFullStations(updatedFullStations)
    setReallocationEmptyStations(updatedEmptyStations)
    setReallocationRoutes(assignedRoutes.map(route => {
      const sourceStation = stationsWithExcessBikes.find(s => s.station_id === route.source.station_id) as StationWithExcess
      return [
        { ...route.source, deliveredBikes: -(sourceStation.excessBikes) },
        ...route.targets.map(target => ({ ...target.station, deliveredBikes: target.bikesToDeliver }))
      ]
    }))
    setReallocationRouteColors(assignedRouteColors)
  }

  // Crear los iconos cuando cambian las rutas
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updatedStations = emptyStations.map(station => {
      const routeIndex = supplyRoutes.findIndex(route => 
        route.some(routeStation => routeStation.station_id === station.station_id)
      )
      const routeColor = routeIndex !== -1 ? supplyRouteColors[routeIndex] : ''
      return {
        ...station,
        routeColor
      }
    })

    // Verificamos si realmente hay cambios antes de actualizar el estado
    const hasChanges = updatedStations.some((station, index) => {
      return station.routeColor !== emptyStations[index].routeColor
    })

    if (hasChanges) {
      setEmptyStations(updatedStations)
    }
  }, [supplyRoutes, supplyRouteColors, emptyStations])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updatedFullStations = fullStations.map(station => {
      const routeIndex = reallocationRoutes.findIndex(route => 
        route[0].station_id === station.station_id
      )
      const routeColor = routeIndex !== -1 ? reallocationRouteColors[routeIndex] : '#0000FF'
      return {
        ...station,
        routeColor
      }
    })

    const updatedEmptyStations = reallocationEmptyStations.map(station => {
      const routeIndex = reallocationRoutes.findIndex(route => 
        route.slice(1).some(routeStation => routeStation.station_id === station.station_id)
      )
      const routeColor = routeIndex !== -1 ? reallocationRouteColors[routeIndex] : '#FF0000'
      return {
        ...station,
        routeColor
      }
    })

    // Verificamos si hay cambios antes de actualizar el estado
    const hasChangesFull = updatedFullStations.some((station, index) => {
      return station.routeColor !== fullStations[index].routeColor
    })
    const hasChangesEmpty = updatedEmptyStations.some((station, index) => {
      return station.routeColor !== reallocationEmptyStations[index].routeColor
    })

    if (hasChangesFull) {
      setFullStations(updatedFullStations)
    }
    if (hasChangesEmpty) {
      setReallocationEmptyStations(updatedEmptyStations)
    }
  }, [reallocationRoutes, reallocationRouteColors, fullStations, reallocationEmptyStations])

  const handleDisabledBikesRefresh = useCallback(() => {
    fetchStations()
    setDisabledBikesRoutes([])
    setDisabledBikesRouteColors([])
    setSelectedDisabledBikesStation(null)
  }, [])

  const calculateDisabledBikesRoutes = useCallback(() => {
    if (disabledBikesTruckCapacity <= 0) {
      alert("Truck capacity must be greater than 0.")
      return
    }

    const stationsWithDisabledBikes = disabledBikesStations.filter(
      (station: Station) => station.num_bikes_disabled > 0
    )

    // Asignar colores a las rutas
    const routesNeeded = Math.ceil(stationsWithDisabledBikes.length / 5)
    const assignedRouteColors = colorPalette.slice(0, routesNeeded)

    // Crear rutas agrupando estaciones
    const assignedRoutes: Station[][] = []
    for (let i = 0; i < stationsWithDisabledBikes.length; i += 5) {
      assignedRoutes.push(stationsWithDisabledBikes.slice(i, i + 5))
    }

    // Actualizar estados
    setDisabledBikesRoutes(assignedRoutes)
    setDisabledBikesRouteColors(assignedRouteColors)

    // Actualizar colores de las estaciones
    const updatedStations = disabledBikesStations.map((station: Station) => {
      const routeIndex = assignedRoutes.findIndex(route => 
        route.some(routeStation => routeStation.station_id === station.station_id)
      )
      return {
        ...station,
        routeColor: routeIndex !== -1 ? assignedRouteColors[routeIndex] : undefined
      }
    })

    setDisabledBikesStations(updatedStations)
  }, [disabledBikesStations, disabledBikesTruckCapacity, colorPalette])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const getColorByDisabledDocks = (numDisabledDocks: number) => {
      if (numDisabledDocks === 1) return '#FFFF00' // Amarillo canario
      if (numDisabledDocks >= 2 && numDisabledDocks <= 4) return '#FFA500' // Ámbar
      return '#FF0000' // Rojo para 5 o más
    }

    const updatedDisabledDocksStations = disabledDocksStations.map(station => ({
      ...station,
      routeColor: getColorByDisabledDocks(station.num_docks_disabled)
    }))

    // Verificamos si hay cambios antes de actualizar el estado
    const hasChanges = updatedDisabledDocksStations.some((station, index) => {
      return station.routeColor !== disabledDocksStations[index].routeColor
    })

    if (hasChanges) {
      setDisabledDocksStations(updatedDisabledDocksStations)
    }
  }, [disabledDocksStations])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const getColorByDisabledBikes = (numDisabledBikes: number) => {
      if (numDisabledBikes === 1) return '#FFFF00' // Amarillo
      if (numDisabledBikes >= 2 && numDisabledBikes <= 4) return '#FFA500' // Ámbar
      return '#FF0000' // Rojo para 5 o más
    }

    const updatedDisabledBikesStations = disabledBikesStations.map(station => ({
      ...station,
      routeColor: getColorByDisabledBikes(station.num_bikes_disabled)
    }))

    // Verificamos si hay cambios antes de actualizar el estado
    const hasChanges = updatedDisabledBikesStations.some((station, index) => {
      return station.routeColor !== disabledBikesStations[index].routeColor
    })

    if (hasChanges) {
      setDisabledBikesStations(updatedDisabledBikesStations)
    }
  }, [disabledBikesStations])

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

      <Card className="bg-white shadow-lg mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-gray-800">Disabled Bikes</CardTitle>
            <Button
              onClick={() => setIsDisabledBikesExpanded(!isDisabledBikesExpanded)}
              variant="ghost"
              size="sm"
            >
              {isDisabledBikesExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        {isDisabledBikesExpanded && (
          <DisabledBikesContent
            disabledStations={disabledBikesStations}
            isLoading={isLoading}
            error={error}
            selectedStation={selectedDisabledBikesStation}
            setSelectedStation={setSelectedDisabledBikesStation}
            handleRefresh={handleDisabledBikesRefresh}
            fillPercentage={disabledBikesFillPercentage}
            setFillPercentage={setDisabledBikesFillPercentage}
            truckCapacity={disabledBikesTruckCapacity}
            setTruckCapacity={setDisabledBikesTruckCapacity}
            routes={disabledBikesRoutes}
            routeColors={disabledBikesRouteColors}
            calculateRoutes={calculateDisabledBikesRoutes}
          />
        )}
      </Card>

      <Card className="bg-white shadow-lg mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-gray-800">Disabled Docks</CardTitle>
            <Button
              onClick={() => setIsDisabledDocksExpanded(!isDisabledDocksExpanded)}
              variant="ghost"
              size="sm"
            >
              {isDisabledDocksExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>
        {isDisabledDocksExpanded && (
          <DisabledDocksContent
            disabledStations={disabledDocksStations}
            isLoading={isLoading}
            error={error}
            selectedStation={selectedDisabledDocksStation}
            setSelectedStation={setSelectedDisabledDocksStation}
            handleRefresh={() => { /* Función de refresco */ }}
            fillPercentage={disabledDocksFillPercentage}
            setFillPercentage={setDisabledDocksFillPercentage}
            truckCapacity={disabledDocksTruckCapacity}
            setTruckCapacity={setDisabledDocksTruckCapacity}
            routes={disabledDocksRoutes}
            routeColors={disabledDocksRouteColors}
            calculateRoutes={() => { /* Función para calcular rutas */ }}
          />
        )}
      </Card>
    </div>
  )
}
