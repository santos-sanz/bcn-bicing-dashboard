import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { addStation, StationInfo } from '../../public/app/station_info';

// Interface for station information from the API
interface ApiStationInfo {
    station_id: string;
    lon: number;
    lat: number;
    post_code?: string;
    name?: string;
    [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Fetch data from APIs
    const [infoResponse, statusResponse] = await Promise.all([
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_information')
        .catch(error => {
          console.error('Error fetching station information:', error.message);
          throw new Error('Failed to fetch station information');
        }),
      axios.get('https://barcelona-sp.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status')
        .catch(error => {
          console.error('Error fetching station status:', error.message);
          throw new Error('Failed to fetch station status');
        }),
    ]);

    if (!infoResponse.data?.data?.stations || !statusResponse.data?.data?.stations) {
      console.error('Invalid API response structure');
      throw new Error('Invalid API response structure');
    }

    const stationInfo: ApiStationInfo[] = infoResponse.data.data.stations;
    const stationStatus = statusResponse.data.data.stations;

    const statusMap = new Map<string, any>();
    stationStatus.forEach((status: any) => {
      statusMap.set(status.station_id, status);
    });

    // File paths
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const stationsPath = path.join(dataDir, 'stations_info.json');

    // Read or initialize stations file
    let stationsInfo: StationInfo[] = [];
    try {
      if (fs.existsSync(stationsPath)) {
        const fileContent = fs.readFileSync(stationsPath, 'utf-8');
        stationsInfo = fileContent ? JSON.parse(fileContent) : [];
      }
    } catch (error) {
      console.error('Error reading stations file:', error);
      stationsInfo = [];
    }

    const existingStationIds = new Set(stationsInfo.map(station => station.station_id));
    const newStations = stationInfo.filter((info: ApiStationInfo) => !existingStationIds.has(info.station_id));

    // Process new stations
    try {
      for (const info of newStations) {
        const [districtInfo, suburbInfo] = (info.cross_street || '').split('/');
        const district_id = districtInfo ? districtInfo.split('-')[0]?.trim() : '';
        const district = districtInfo ? districtInfo.split('-')[1]?.trim() : '';
        const suburb_id = suburbInfo ? suburbInfo.split('-')[0]?.trim() : '';
        const suburb = suburbInfo ? suburbInfo.split('-')[1]?.trim() : '';

        const station: StationInfo = {
          station_id: info.station_id,
          name: info.name || '',
          lon: info.lon,
          lat: info.lat,
          post_code: info.post_code || "Unknown",
          district_id,
          district,
          suburb_id,
          suburb
        };

        await addStation(station).catch(error => {
          console.error(`Error adding station ${info.station_id}:`, error);
        });
      }
    } catch (error) {
      console.error('Error processing new stations:', error);
    }

    // Read updated stations info
    let updatedStationsInfo: StationInfo[] = [];
    try {
      if (fs.existsSync(stationsPath)) {
        const fileContent = fs.readFileSync(stationsPath, 'utf-8');
        updatedStationsInfo = fileContent ? JSON.parse(fileContent) : [];
      }
    } catch (error) {
      console.error('Error reading updated stations file:', error);
      updatedStationsInfo = stationsInfo; // Fallback to original data
    }

    // Create info map
    const infoMap = new Map<string, any>();
    updatedStationsInfo.forEach((station: StationInfo) => {
      infoMap.set(station.station_id, {
        name: station.name,
        suburb: station.suburb,
        suburb_id: station.suburb_id,
        district: station.district,
        district_id: station.district_id
      });
    });

    // Combine station info
    const combinedStations = stationInfo.map((info: ApiStationInfo) => {
      const status = statusMap.get(info.station_id) || {};
      const additionalInfo = infoMap.get(info.station_id) || {};
      
      return {
        ...info,
        ...status,
        ...additionalInfo
      };
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(combinedStations);
  } catch (error: any) {
    console.error('API Error:', error.message);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}