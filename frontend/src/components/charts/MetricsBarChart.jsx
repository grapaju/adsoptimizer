import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { formatCurrency, formatNumber } from '../../utils/format';

const MetricsBarChart = ({
  data,
  bars = [],
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal'
}) => {
  const formatTooltipValue = (value, name) => {
    if (name.toLowerCase().includes('cost') || name.toLowerCase().includes('value')) {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis 
          type={layout === 'horizontal' ? 'category' : 'number'}
          dataKey={layout === 'horizontal' ? 'name' : undefined}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis 
          type={layout === 'horizontal' ? 'number' : 'category'}
          dataKey={layout === 'vertical' ? 'name' : undefined}
          stroke="#9ca3af"
          fontSize={12}
        />
        <Tooltip 
          formatter={formatTooltipValue}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        {showLegend && <Legend />}
        {bars.map((bar, index) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name || bar.dataKey}
            fill={bar.color || colors[index % colors.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MetricsBarChart;
