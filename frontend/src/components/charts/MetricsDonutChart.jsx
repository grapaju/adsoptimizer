/**
 * Componente de Gráfico Donut/Pie
 * Usado para exibir ROAS e outras métricas proporcionais
 */
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend 
} from 'recharts';

// Cores padrão para o gráfico
const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

/**
 * Gráfico Donut/Pie reutilizável
 * @param {Array} data - Dados no formato [{ name, value }]
 * @param {number} height - Altura do gráfico
 * @param {boolean} showLegend - Mostrar legenda
 * @param {boolean} showLabels - Mostrar labels nas fatias
 * @param {number} innerRadius - Raio interno (0 para pie chart)
 * @param {number} outerRadius - Raio externo
 * @param {Array} colors - Array de cores customizadas
 */
const MetricsDonutChart = ({
  data = [],
  height = 300,
  showLegend = true,
  showLabels = false,
  innerRadius = 60,
  outerRadius = 100,
  colors = COLORS,
  valueFormatter = (value) => value.toFixed(2),
  centerLabel = null
}) => {
  // Label customizado para exibir dentro das fatias
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (!showLabels || percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {valueFormatter(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Legenda customizada
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderCustomLabel : false}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || colors[index % colors.length]}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Label central para gráficos donut */}
      {centerLabel && innerRadius > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{centerLabel.value}</p>
            <p className="text-sm text-gray-500">{centerLabel.label}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsDonutChart;
