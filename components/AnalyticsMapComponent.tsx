"use client"

import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, useMap, CircleMarker, Tooltip } from 'react-leaflet'
import { Station } from '@/types/station'

type AnalyticsMapComponentProps = {
  stations: Station[];
  getMarkerColor: (station: Station) => string;
  getMarkerSize?: (station: Station) => number;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  heatMapMode?: string;
  getMetricValue?: (station: Station) => number;
};

const DEFAULT_CENTER: [number, number] = [41.3874, 2.1686];
const DEFAULT_ZOOM = 13;

const getMetricLabel = (mode: string): string => {
  switch (mode) {
    case 'all-absolute': return 'Total Events';
    case 'in-absolute': return 'Bikes In';
    case 'out-absolute': return 'Bikes Out';
    case 'all-relative': return 'Events per Day/Capacity';
    case 'in-relative': return 'Bikes In per Day/Capacity';
    case 'out-relative': return 'Bikes Out per Day/Capacity';
    case 'all-percentile': return 'Usage Percentile';
    case 'in-percentile': return 'Usage Percentile';
    case 'out-percentile': return 'Usage Percentile';
    case 'empty-time': return 'Time Empty';
    case 'full-time': return 'Time Full';
    case 'empty-percentile': return 'Empty Time Percentile';
    case 'full-percentile': return 'Full Time Percentile';
    default: return '';
  }
};

function UpdateMapCenter({ 
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM 
}: { 
  defaultCenter?: [number, number];
  defaultZoom?: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    map.setView(defaultCenter, defaultZoom);
  }, [map, defaultCenter, defaultZoom]);
  
  return null;
}

// Añade esta función helper para determinar si es una métrica relativa o percentil
const isRelativeMetric = (mode: string): boolean => {
  return mode.endsWith('-relative');
};

const isPercentileMetric = (mode: string): boolean => {
  return mode.endsWith('-percentile');
};

export default function AnalyticsMapComponent({ 
  stations,
  getMarkerColor,
  getMarkerSize = () => 10,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
  heatMapMode = '',
  getMetricValue = () => 0
}: AnalyticsMapComponentProps) {
  if (!stations || stations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading stations data...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-[-20%] origin-center" style={{ transform: 'rotate(45deg) scale(1.7)' }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <UpdateMapCenter 
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {stations.map((station) => {
            const lat = typeof station.lat === 'string' ? parseFloat(station.lat) : station.lat;
            const lon = typeof station.lon === 'string' ? parseFloat(station.lon) : station.lon;
            
            if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
              return null;
            }

            const markerSize = getMarkerSize(station);
            const color = getMarkerColor(station);
            const metricValue = getMetricValue(station);
            const label = getMetricLabel(heatMapMode);
            const isRelative = isRelativeMetric(heatMapMode);
            const isPercentile = isPercentileMetric(heatMapMode);

            return (
              <CircleMarker
                key={station.station_id}
                center={[lat, lon]}
                radius={markerSize / 2}
                pathOptions={{
                  color: 'rgba(0, 0, 0, 0.3)',
                  weight: 1,
                  fillColor: color,
                  fillOpacity: 1
                }}
              >
                <Tooltip 
                  direction="top"
                  offset={[0, -markerSize / 2]}
                  opacity={1}
                >
                  <div>
                    <div>{station.name}</div>
                    {label && (
                      <div>
                        {label}: {
                          heatMapMode.includes('-time') 
                            ? `${(metricValue * 100).toFixed(1)}%`
                            : heatMapMode.includes('-percentile')
                              ? `${(metricValue * 100).toFixed(1)}%`
                              : isRelativeMetric(heatMapMode)
                                ? metricValue.toFixed(2)
                                : Math.round(metricValue)
                        }
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
} 