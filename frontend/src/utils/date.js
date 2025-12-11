import { format, formatDistanceToNow, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatStr, { locale: ptBR });
};

export const formatDateTime = (date) => {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
};

export const formatTimeAgo = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: ptBR });
};

/**
 * Formata data relativa (hoje, ontem, ou data)
 */
export const formatRelative = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(parsedDate)) {
    return format(parsedDate, 'HH:mm');
  }
  
  if (isYesterday(parsedDate)) {
    return 'Ontem';
  }
  
  return format(parsedDate, 'dd/MM', { locale: ptBR });
};

export const formatChatDate = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(parsedDate)) {
    return format(parsedDate, 'HH:mm');
  }
  
  if (isYesterday(parsedDate)) {
    return 'Ontem';
  }
  
  return format(parsedDate, 'dd/MM/yyyy');
};

export const formatChatTime = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'HH:mm');
};
