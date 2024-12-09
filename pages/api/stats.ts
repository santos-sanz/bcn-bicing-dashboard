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
    station_code
  } = req.query

  // Validate required parameters
  if (!from_date || !to_date || !model || !station_code) {
    return res.status(400).json({ 
      message: 'Missing required parameters: from_date, to_date, model, and station_code are required'
    })
  }

  try {
    const MAX_RETRIES = 3;
    const BASE_TIMEOUT = 150000; // 150 seconds
    const MAX_TIMEOUT = 300000; // 300 seconds
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const url = new URL(`${process.env.API_ANALYTICS_URL}/stats`)
        url.searchParams.append('from_date', from_date as string)
        url.searchParams.append('to_date', to_date as string)
        url.searchParams.append('model', model as string)
        url.searchParams.append('station_code', station_code as string)

        // Log attempt information
        console.log(`Attempt ${attempt + 1}/${MAX_RETRIES} - Calling URL:`, url.toString())

        // Calculate timeout with exponential backoff, but cap it
        const timeout = Math.min(BASE_TIMEOUT * Math.pow(2, attempt), MAX_TIMEOUT)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          })
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
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
        attempt++
        console.error(`Attempt ${attempt} failed:`, error)
        
        if (attempt === MAX_RETRIES) {
          console.error(`Failed after ${MAX_RETRIES} attempts:`, error)
          return res.status(503).json({ 
            message: 'Service temporarily unavailable after multiple retries',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }

        // Calculate wait time with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000) // Cap at 10 seconds
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
  } catch (error) {
    console.error('Error in stats handler:', error)
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
