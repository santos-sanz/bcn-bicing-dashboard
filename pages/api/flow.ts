import { NextApiRequest, NextApiResponse } from 'next'
import { writeFile } from 'fs/promises'
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
    model_code,
    output = 'both',
    aggregation_timeframe = '1h'
  } = req.query

  // Validate required parameters
  if (!from_date || !to_date || !model || !model_code) {
    return res.status(400).json({ 
      message: 'Missing required parameters: from_date, to_date, model, and model_code are required'
    })
  }

  try {
    // Add retry logic for fetch
    const MAX_RETRIES = 3;
    let attempt = 0;
    let lastError;

    while (attempt < MAX_RETRIES) {
      try {
        const url = new URL(`${process.env.API_ANALYTICS_URL}/flow`)
        url.searchParams.append('from_date', from_date as string)
        url.searchParams.append('to_date', to_date as string)
        url.searchParams.append('model', model as string)
        url.searchParams.append('model_code', model_code as string)
        url.searchParams.append('output', output as string)
        url.searchParams.append('aggregation_timeframe', aggregation_timeframe as string)

        const response = await fetch(url.toString(), {
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json()
        
        // Save data to flow.json
        const filePath = path.join(process.cwd(), 'public/data/flow.json')
        await writeFile(filePath, JSON.stringify(data, null, 2))

        return res.status(200).json(data)

      } catch (error) {
        lastError = error;
        attempt++;
        if (attempt === MAX_RETRIES) {
          console.error(`Failed after ${MAX_RETRIES} attempts:`, error);
          return res.status(500).json({ 
            message: 'Failed to fetch flow data from analytics API',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
  } catch (error) {
    console.error('Error fetching flow data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
