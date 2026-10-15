// Request Validators [P2]
// Responsibilities: Schema and field validation for auth, students, drives, applications

/**
 * Validates drive creation input
 */
function validateDriveInput(body) {
  const errors = [];
  if (!body.title) errors.push('Title is required');
  if (!body.ctcAnnual || body.ctcAnnual <= 0) errors.push('Valid CTC is required');
  if (body.minCgpa !== undefined && (body.minCgpa < 0 || body.minCgpa > 10)) {
    errors.push('Min CGPA must be between 0 and 10');
  }
  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateDriveInput,
};
