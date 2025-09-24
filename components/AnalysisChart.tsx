import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SentimentData } from '../types';

interface AnalysisChartProps {
  data: SentimentData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

const CustomTick = (props: any) => {
  const { x, y, payload } = props;
  const { value } = payload;
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#e2e8f0" fontSize="14px" fontWeight="bold">
        {value}
      </text>
    </g>
  );
};


export const AnalysisChart: React.FC<AnalysisChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
        <XAxis dataKey="name" stroke="#a0aec0" tick={<CustomTick />} interval={0} axisLine={{ stroke: '#4a5568' }} tickLine={false} />
        <YAxis stroke="#a0aec0" allowDecimals={false} tick={{ fill: '#a0aec0' }} axisLine={{ stroke: '#4a5568' }} />
        <Tooltip
          cursor={{fill: 'rgba(136, 132, 216, 0.2)'}}
          contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568', borderRadius: '0.5rem' }}
          labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}
          itemStyle={{ color: '#cbd5e0' }}
        />
        <Bar dataKey="count" fill="#8884d8" name="コメント数" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};