// Eligibility Service [P2]

function evaluateEligibility(student, drive) {
  const reasons = [];

  if (!student || !drive) {
    return {
      isEligible: false,
      reasons: ['Student profile or job drive criteria are missing'],
    };
  }

  if (student.cgpa == null || student.cgpa === '' || student.active_backlogs == null || student.active_backlogs === '' || !student.department || student.batch_year == null || student.batch_year === '') {
    reasons.push('Student academic profile is incomplete');
  }
  if (!Number.isFinite(Number(student.cgpa)) || !Number.isFinite(Number(drive.min_cgpa)) ||
      !Number.isFinite(Number(student.active_backlogs)) || !Number.isFinite(Number(drive.max_active_backlogs))) {
    reasons.push('Academic eligibility data is invalid');
  }

  if (Number(student.cgpa) < Number(drive.min_cgpa)) {
    reasons.push(
      `CGPA must be at least ${drive.min_cgpa}`
    );
  }

  if (
    Number(student.active_backlogs) >
    Number(drive.max_active_backlogs)
  ) {
    reasons.push(
      `Active backlogs must not exceed ${drive.max_active_backlogs}`
    );
  }

  if (
    !Array.isArray(drive.eligible_departments) || drive.eligible_departments.length === 0 ||
    !drive.eligible_departments.includes(student.department)
  ) {
    reasons.push('Department is not eligible for this drive');
  }

  if (
    !Array.isArray(drive.eligible_batch_years) ||
    !drive.eligible_batch_years.includes(Number(student.batch_year))
  ) {
    reasons.push('Batch year is not eligible for this drive');
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

module.exports = { evaluateEligibility };
