"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function AnalyticsPage() {
  const [usageData, setUsageData] = useState([])

  useEffect(() => {
    fetch('/mock_data/mock_flow_real.json')
      .then(response => response.json())
      .then(data => setUsageData(data))
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded shadow">
          <p className="label">{`Time: ${label}`}</p>
          <p className="intro">{`Bikes In: ${payload[0].value.toFixed(2)}`}</p>
          <p className="intro">{`Bikes Out: ${payload[1].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Bicing Analytics</h1>
      
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-gray-800">Usage Flows - Last 24 hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(value) => value} 
                  domain={['dataMin', 'dataMax']} 
                  ticks={Array.from({ length: 13 }, (_, i) => `${(i * 2).toString().padStart(2, '0')}:00`)} 
                  interval={0} 
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="in_bikes" 
                  name="Bikes In"
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="out_bikes" 
                  name="Bikes Out"
                  stroke="#f63b54" 
                  strokeWidth={2} 
                  dot={{ stroke: '#f63b54', strokeWidth: 2, fill: '#fff' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}