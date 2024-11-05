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
    [key: string]: any; // for other fields that the API might have
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


    const statusMap = new Map<string, any>();
    stationStatus.forEach((status: any) => {
      statusMap.set(status.station_id, status);
    });


    // File paths
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const stationsPath = path.join(dataDir, 'stations_info.json');

 
    // Read or initialize stations file
    let stationsInfo: StationInfo[] = [];
    if (fs.existsSync(stationsPath)) {
      const fileContent = fs.readFileSync(stationsPath, 'utf-8');
      stationsInfo = fileContent ? JSON.parse(fileContent) : [];
    }


    const existingStationIds = new Set(stationsInfo.map(station => station.station_id));


    // Filter new stations
    const newStations = stationInfo.filter((info: ApiStationInfo) => !existingStationIds.has(info.station_id));


    for (const info of newStations) {
      const station: StationInfo = {
        station_id: info.station_id,
        lon: info.lon,
        lat: info.lat,
        post_code: info.post_code || "Unknown",
      };

      await addStation(station);
    }

    
    // Map suburb and district information
    const infoMap = new Map<string, any>();
    stationsInfo.forEach((station: any) => {
      infoMap.set(station.station_id, { 
        suburb: station.suburb, 
        district: station.district 
      });
    });


    if (newStations.length > 0) {
      const updatedContent = fs.readFileSync(stationsPath, 'utf-8');
      const updatedStationsInfo = updatedContent ? JSON.parse(updatedContent) : [];
      
  
      updatedStationsInfo.forEach((station: any) => {
        infoMap.set(station.station_id, { 
          suburb: station.suburb, 
          district: station.district 
        });
      });
    }


    // Backup info map
    const backupInfoMap = new Map<string, any>();
    if (fs.existsSync(stationsPath)) {
      const fileContent = fs.readFileSync(stationsPath, 'utf-8');
      const stationsInfo = fileContent ? JSON.parse(fileContent) : [];
      stationsInfo.forEach((station: any) => {
        backupInfoMap.set(station.station_id, {
          suburb: station.suburb,
          district: station.district
        });
      });
    }


    // Combine station info
    const combinedStations = stationInfo.map((info: any) => {

      const [districtInfo, suburbInfo] = (info.cross_street || '').split('/');
      const district_id = districtInfo ? districtInfo.split('-')[0]?.trim() : '';
      const district = districtInfo ? districtInfo.split('-')[1]?.trim() : '';
      const suburb_id = suburbInfo ? suburbInfo.split('-')[0]?.trim() : '';
      const suburb = suburbInfo ? suburbInfo.split('-')[1]?.trim() : '';

   
      const backupInfo = backupInfoMap.get(info.station_id);
      
      return {
        ...info,
        ...statusMap.get(info.station_id),
        district_id,
        district: district || (backupInfo?.district || ''),
        suburb_id,
        suburb: suburb || (backupInfo?.suburb || ''),
      };
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(combinedStations);
  } catch (error) {
    console.error('Error getting data from APIs:', error);
    res.status(500).json({ error: 'Error getting data from APIs' });
  }
}