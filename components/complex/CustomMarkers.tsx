'use client'

import L from 'leaflet'

// Función para crear el marcador con signo más (+)
export const createPlusMarker = (color?: string) => {
  const backgroundColor = color || '#fff'
  const textColor = color ? '#fff' : '#000'
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${backgroundColor}; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 2px solid #000; 
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          font-weight: bold;
          font-size: 16px;
          color: ${textColor};
          line-height: 1;
        ">+</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Función para crear el marcador con signo menos (-)
export const createMinusMarker = (color?: string) => {
  const backgroundColor = color || '#fff'
  const textColor = color ? '#fff' : '#000'
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${backgroundColor}; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 2px solid #000; 
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          font-weight: bold;
          font-size: 16px;
          color: ${textColor};
          line-height: 1;
        ">-</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
