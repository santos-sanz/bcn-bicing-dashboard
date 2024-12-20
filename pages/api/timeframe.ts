import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const response = await fetch(`${process.env.API_ANALYTICS_URL}/timeframe`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch data')
    }

    const data = await response.json()
    
    // Remove file writing operation and return data directly
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('Error fetching timeframe data:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
