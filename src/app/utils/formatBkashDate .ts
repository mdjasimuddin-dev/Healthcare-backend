export const formatBkashDate = (dateString: string): Date => {
  const formattedDate = dateString.replace(
    /(\d{2}:\d{2}:\d{2}):(\d{3}) GMT([+-]\d{2})(\d{2})/,
    '$1.$2$3:$4'
  );

  const date = new Date(formattedDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid bKash completedTime: ${dateString}`);
  }

  return date;
};
