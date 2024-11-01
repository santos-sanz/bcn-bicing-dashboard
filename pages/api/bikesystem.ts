import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import stationsInfo from '../../public/data/stations_info.json';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const [infoResponse, statusResponse] = await Promise.all([
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_information'),
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status'),
    ]);

    const stationInfo = infoResponse.data.data.stations;
    const stationStatus = statusResponse.data.data.stations;

    // Crear un mapa de estado por station_id
    const statusMap = new Map<string, any>();
    stationStatus.forEach((status: any) => {
      statusMap.set(status.station_id, status);
    });

    // Crear un mapa de información por station_id desde stations_info.json
    const infoMap = new Map<string, any>();
    stationsInfo.forEach((station: any) => {
      infoMap.set(station.station_id, { suburb: station.suburb, district: station.district });
    });

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