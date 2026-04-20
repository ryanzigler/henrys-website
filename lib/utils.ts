export const formatEdited = (updatedAt: number) => {
  const days = Math.floor(
    Math.max(0, Date.now() - updatedAt) / (1000 * 60 * 60 * 24),
  );

  if (days === 0) return 'Edited today';
  if (days === 1) return 'Edited yesterday';
  if (days < 7) return `Edited ${days} days ago`;
  if (days < 14) return 'Edited a week ago';
  if (days < 30) return `Edited ${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'Edited a month ago';
  return `Edited ${Math.floor(days / 30)} months ago`;
};
export const formatDate = () =>
  new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
