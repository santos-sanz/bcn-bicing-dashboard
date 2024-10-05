import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// URL del endpoint para listar todas las redes de bicicletas compartidas
const bicingUrl = 'http://api.citybik.es/v2/networks/bicing';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await axios.get(bicingUrl);
    const data = response.data;
    
    // Añadir encabezados para evitar el almacenamiento en caché
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener los datos de Bicing:', error);
    res.status(500).json({ error: 'Error al obtener los datos de Bicing' });
  }
}