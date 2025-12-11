import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatDate } from '../../utils/date';
import { formatCurrency, formatNumber } from '../../utils/format';

const MetricsLineChart = ({ 
  data = [], 
  lines = [],
  height = 300,
  showGrid = true,
  showLegend = true 
}) => {
  // Ensure data is an array
  const chartData = Array.isArray(data) ? data : [];
  
  const formatXAxis = (date) => {
    return formatDate(date, 'dd/MM');
  };

  const formatTooltipValue = (value, name) => {
    switch (name) {
      case 'cost':
      case 'conversion_value':
        return formatCurrency(value);
      case 'ctr':
      case 'roas':
        return `${parseFloat(value).toFixed(2)}`;
      default:
        return formatNumber(value);
    }
  };

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis 
          dataKey="date" 
          tickFormatter={formatXAxis}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          formatter={formatTooltipValue}
          labelFormatter={(label) => formatDate(label, 'dd/MM/yyyy')}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name || line.dataKey}
            stroke={line.color || colors[index % colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MetricsLineChart;
