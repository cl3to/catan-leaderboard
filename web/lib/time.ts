const TIME_ZONE = 'America/Sao_Paulo';
const SAO_PAULO_OFFSET = '-03:00';

export const formatSaoPauloDateTime = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
};

export const toSaoPauloDateTimeLocalValue = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
};

export const toIsoFromSaoPauloLocalValue = (value: string) =>
  new Date(`${value}:00${SAO_PAULO_OFFSET}`).toISOString();
