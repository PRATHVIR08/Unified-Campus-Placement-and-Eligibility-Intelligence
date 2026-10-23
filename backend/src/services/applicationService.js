function isDriveOpen(drive, now = new Date()) {
  return Boolean(
    drive && drive.status === 'active' &&
    new Date(drive.application_deadline).getTime() >= now.getTime()
  );
}

function isValidStatusTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return false;
  if (nextStatus === 'withdrawn') return currentStatus === 'applied';
  const transitions = {
    applied: ['shortlisted', 'rejected'],
    shortlisted: ['in_interview', 'rejected'],
    in_interview: ['offered', 'rejected'],
    offered: ['accepted', 'rejected'],
  };
  return (transitions[currentStatus] || []).includes(nextStatus);
}

module.exports = { isDriveOpen, isValidStatusTransition };
