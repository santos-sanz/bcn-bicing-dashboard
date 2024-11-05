import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { addStation, StationInfo } from '../../public/app/station_info';

// Interfaz para la información de estaciones de la API
interface ApiStationInfo {
    station_id: string;
    lon: number;
    lat: number;
    post_code?: string;
    [key: string]: any; // para otros campos que pueda tener la API
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const [infoResponse, statusResponse] = await Promise.all([
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_information'),
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status'),
    ]);

    const stationInfo: ApiStationInfo[] = infoResponse.data.data.stations;
    const stationStatus = statusResponse.data.data.stations;

    // Crear un mapa de estado por station_id
    const statusMap = new Map<string, any>();
    stationStatus.forEach((status: any) => {
      statusMap.set(status.station_id, status);
    });

    // Ruta del archivo stations_info.json
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const stationsPath = path.join(dataDir, 'stations_info.json');

    // Leer el archivo inicial de estaciones_info.json
    let stationsInfo: StationInfo[] = [];
    if (fs.existsSync(stationsPath)) {
      const fileContent = fs.readFileSync(stationsPath, 'utf-8');
      stationsInfo = fileContent ? JSON.parse(fileContent) : [];
    }

    // Crear un conjunto de IDs de estaciones existentes
    const existingStationIds = new Set(stationsInfo.map(station => station.station_id));

    // Encontrar nuevas estaciones que necesitan ser añadidas
    const newStations = stationInfo.filter((info: ApiStationInfo) => !existingStationIds.has(info.station_id));

    // Procesar y añadir solo las nuevas estaciones
    for (const info of newStations) {
      const station: StationInfo = {
        station_id: info.station_id,
        lon: info.lon,
        lat: info.lat,
        post_code: info.post_code || "Unknown",
      };

      await addStation(station);
    }

    // Crear un mapa de información por station_id desde stations_info.json
    const infoMap = new Map<string, any>();
    stationsInfo.forEach((station: any) => {
      infoMap.set(station.station_id, { 
        suburb: station.suburb, 
        district: station.district 
      });
    });

    // Leer el archivo actualizado de estaciones si se añadieron nuevas
    if (newStations.length > 0) {
      const updatedContent = fs.readFileSync(stationsPath, 'utf-8');
      const updatedStationsInfo = updatedContent ? JSON.parse(updatedContent) : [];
      
      // Actualizar el mapa de información con las estaciones nuevas
      updatedStationsInfo.forEach((station: any) => {
        infoMap.set(station.station_id, { 
          suburb: station.suburb, 
          district: station.district 
        });
      });
    }

    // Combinar la información de las estaciones
    const combinedStations = stationInfo.map((info: any) => ({
      ...info,
      ...statusMap.get(info.station_id),
      ...infoMap.get(info.station_id),
    }));

    // Deshabilitar el caché para esta respuesta
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(combinedStations);
  } catch (error) {
    console.error('Error al obtener datos de las APIs:', error);
    res.status(500).json({ error: 'Error al obtener datos de las APIs' });
  }
}