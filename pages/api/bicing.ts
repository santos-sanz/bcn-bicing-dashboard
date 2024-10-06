import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await axios.get('http://api.citybik.es/v2/networks/bicing');
    const stations = response.data.network.stations;

    // Disable caching for this response
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json(stations);
  } catch (error) {
    console.error('Error fetching Bicing data:', error);
    res.status(500).json({ error: 'Error fetching Bicing data' });
  }
}