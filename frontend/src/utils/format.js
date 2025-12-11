export const formatCurrency = (value, currency = 'BRL') => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatCompactNumber = (value) => {
  if (value === null || value === undefined) return '-';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatNumber(value);
};

export const formatROAS = (value) => {
  if (value === null || value === undefined) return '-';
  return `${parseFloat(value).toFixed(2)}x`;
};

export const formatCTR = (value) => {
  if (value === null || value === undefined) return '-';
  return `${parseFloat(value).toFixed(2)}%`;
};
