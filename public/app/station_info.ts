import fs from 'fs';
import path from 'path';
import * as turf from '@turf/turf';
import { point } from '@turf/helpers';
import { GeoJSON } from 'geojson';
type FeatureCollection = GeoJSON.FeatureCollection;

export interface StationInfo {
    station_id: string;
    name: string;
    lon: number;
    lat: number;
    post_code: string;
    district_id: string;
    district: string;
    suburb_id: string;
    suburb: string;
}

export async function addStation(station: StationInfo): Promise<void> {
    const dataDir = path.join(process.cwd(), 'public', 'data');

    // File paths
    const stationsPath = path.join(dataDir, 'stations_info.json');
    const districtesPath = path.join(dataDir, 'districtes.geojson');
    const barrisPath = path.join(dataDir, 'barris.geojson');

    // Read and parse GeoJSON files
    const districtesData = JSON.parse(fs.readFileSync(districtesPath, 'utf-8'));
    const barrisData = JSON.parse(fs.readFileSync(barrisPath, 'utf-8'));

    // Read or initialize stations file
    let stations: StationInfo[] = [];
    if (fs.existsSync(stationsPath)) {
        const fileContent = fs.readFileSync(stationsPath, 'utf-8');
        try {
            stations = fileContent ? JSON.parse(fileContent) : [];
        } catch (error) {
            console.log('Error parsing stations file, initializing empty array');
            stations = [];
        }
    }

    // Check if station_id already exists
    if (stations.some(s => s.station_id === station.station_id)) {
        console.log(`Station with ID ${station.station_id} already exists.`);
        return;
    }

    // Create a GeoJSON point for the station
    const point = turf.point([station.lon, station.lat]);

    // Function to find name based on GeoJSON
    const findName = (geojson: FeatureCollection, point: GeoJSON.Point): string | undefined => {
        for (const feature of geojson.features) {
            if (turf.booleanPointInPolygon(point, feature.geometry as GeoJSON.Polygon)) {
                if (feature.properties && feature.properties.NOM) {
                    return feature.properties.NOM;
                }
            }
        }
        return undefined;
    };
    // Calculate suburb and district
    const suburb = findName(barrisData, point.geometry);
    const district = findName(districtesData, point.geometry);

    // Add the new station
    const newStation: StationInfo = {
        ...station,
        suburb: suburb || "Unknown",
        district: district || "Unknown"
    };

    stations.push(newStation);

    // Write back to JSON file
    fs.writeFileSync(stationsPath, JSON.stringify(stations, null, 2), 'utf-8');

    console.log(`Station with ID ${station.station_id} added successfully.`);
}