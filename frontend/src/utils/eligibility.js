export function getEligibilityReasonMessages(reasons) {
  if (!Array.isArray(reasons)) return [];

  return reasons
    .map((reason) => (
      typeof reason === 'string'
        ? reason
        : reason?.message || reason?.reason
    ))
    .filter((message) => typeof message === 'string' && message.trim());
}
