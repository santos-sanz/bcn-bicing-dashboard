import { NextApiRequest, NextApiResponse } from 'next'
import { promises as fs } from 'fs'
import path from 'path'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { 
    from_date,
    to_date, 
    model,
    model_code
  } = req.query

  // Validate required parameters
  if (!from_date || !to_date || !model || !model_code) {
    return res.status(400).json({ 
      message: 'Missing required parameters: from_date, to_date, model, and model_code are required'
    })
  }

  try {
    // Fetch stats data with retry logic
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError;

    while (attempt < MAX_RETRIES) {
      try {
        const url = new URL(`${process.env.API_ANALYTICS_URL}/stats`)
        url.searchParams.append('from_date', from_date as string)
        url.searchParams.append('to_date', to_date as string)
        url.searchParams.append('model', model as string)
        url.searchParams.append('model_code', model_code as string)

        const response = await fetch(url.toString(), {
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const statsData = await response.json();

        // Read stations info
        const stationsFile = path.join(process.cwd(), 'public/data/stations_info.json')
        const stationsRaw = await fs.readFile(stationsFile, 'utf8')
        const stationsInfo = JSON.parse(stationsRaw)

        // Create lookup map for stations
        const stationsMap = new Map(
          stationsInfo.map((station: any) => [station.station_id, station])
        )

        // Merge stats with station info
        const mergedData = statsData.map((stat: any) => ({
          ...stat,
          station_info: stationsMap.get(stat.station_id) || null
        }))

        // Save data to stats.json
        const filePath = path.join(process.cwd(), 'public/data/stats.json')
        await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2))

        return res.status(200).json(mergedData)
        
      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt === MAX_RETRIES) {
          console.error(`Failed after ${MAX_RETRIES} attempts:`, error);
          return res.status(500).json({ 
            message: 'Failed to fetch data from analytics API',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
  } catch (error) {
    console.error('Error processing stats data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
