import { NextApiRequest, NextApiResponse } from 'next'

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
    const url = new URL(`${process.env.API_ANALYTICS_URL}/flow`)
    url.searchParams.append('from_date', from_date as string)
    url.searchParams.append('to_date', to_date as string)
    url.searchParams.append('model', model as string)
    url.searchParams.append('model_code', model_code as string)
    url.searchParams.append('output', output as string)
    url.searchParams.append('aggregation_timeframe', aggregation_timeframe as string)

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }

    const data = await response.json()
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('Error fetching flow data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
