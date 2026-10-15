// Eligibility Service [P2]
// Core Domain Service: Evaluates a student's profile against job drive criteria
// Output format: { isEligible: boolean, reasons: string[] }

/**
 * Evaluates whether a student satisfies the eligibility criteria for a given drive.
 * @param {Object} student - Student profile (cgpa, active_backlogs, department, batch_year)
 * @param {Object} drive - Job drive criteria (min_cgpa, max_active_backlogs, eligible_departments, eligible_batch_years)
 * @returns {{ isEligible: boolean, reasons: string[] }}
 */
function evaluateEligibility(student, drive) {
  // Scaffolding:
  // 1. Check CGPA (student.cgpa >= drive.min_cgpa)
  // 2. Check Backlogs (student.active_backlogs <= drive.max_active_backlogs)
  // 3. Check Department (drive.eligible_departments includes student.department)
  // 4. Check Batch Year (drive.eligible_batch_years includes student.batch_year)
  return {
    isEligible: true,
    reasons: [],
  };
}

module.exports = {
  evaluateEligibility,
};
