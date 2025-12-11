/**
 * Componente de Gauge Chart
 * Usado para exibir métricas de Impression Share e outras porcentagens
 */
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/**
 * Gráfico de Gauge/Medidor
 * @param {number} value - Valor atual (0-100)
 * @param {number} maxValue - Valor máximo (padrão 100)
 * @param {string} label - Rótulo da métrica
 * @param {string} valueLabel - Formato do valor exibido
 * @param {Array} thresholds - Limites para cores [baixo, médio]
 */
const MetricsGaugeChart = ({
  value = 0,
  maxValue = 100,
  label = '',
  valueLabel = null,
  size = 200,
  thresholds = [30, 70],
  colors = {
    low: '#ef4444',    // vermelho
    medium: '#f59e0b', // amarelo
    high: '#22c55e'    // verde
  }
}) => {
  // Calcular porcentagem
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  // Determinar cor baseado nos thresholds
  const getColor = () => {
    if (percentage < thresholds[0]) return colors.low;
    if (percentage < thresholds[1]) return colors.medium;
    return colors.high;
  };

  // Dados para o semi-círculo
  const data = [
    { value: percentage, color: getColor() },
    { value: 100 - percentage, color: '#e5e7eb' }
  ];

  return (
    <div className="relative" style={{ width: size, height: size * 0.6 }}>
      <ResponsiveContainer width="100%" height={size * 0.7}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.25}
            outerRadius={size * 0.35}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Valor central */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 text-center"
        style={{ bottom: size * 0.05 }}
      >
        <p className="text-2xl font-bold text-gray-900">
          {valueLabel || `${percentage.toFixed(1)}%`}
        </p>
        {label && (
          <p className="text-sm text-gray-500">{label}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Card de métrica com mini gauge
 */
export const GaugeMetricCard = ({
  title,
  value,
  maxValue = 100,
  description,
  trend = null,
  thresholds = [30, 70]
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const getColor = () => {
    if (percentage < thresholds[0]) return 'text-red-600';
    if (percentage < thresholds[1]) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBgColor = () => {
    if (percentage < thresholds[0]) return 'bg-red-100';
    if (percentage < thresholds[1]) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${getColor()}`}>
            {percentage.toFixed(1)}%
          </p>
        </div>
        {trend !== null && (
          <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      
      {/* Barra de progresso */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getBgColor().replace('100', '500')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {description && (
        <p className="mt-2 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};

export default MetricsGaugeChart;
