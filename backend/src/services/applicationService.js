// Application Service [P2]
// Core Domain Service: Deadline verification, duplicate submission checks, and status state transitions

/**
 * Checks if a drive is accepting applications.
 * @param {Object} drive
 * @returns {boolean}
 */
function isDriveOpen(drive) {
  // Scaffolding: Check status === 'active' && new Date() <= new Date(drive.application_deadline)
  return true;
}

/**
 * Validates allowable state transitions for candidate applications.
 * Valid flow: applied -> shortlisted -> in_interview -> offered -> (accepted | rejected)
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
function isValidStatusTransition(currentStatus, nextStatus) {
  // Scaffolding: State machine transition check
  return true;
}

module.exports = {
  isDriveOpen,
  isValidStatusTransition,
};
