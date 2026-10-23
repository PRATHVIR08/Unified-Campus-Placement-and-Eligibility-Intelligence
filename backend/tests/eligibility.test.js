// Eligibility Service Unit Tests [P2]
const { evaluateEligibility } = require('../src/services/eligibilityService');

describe('Eligibility Service Unit Tests', () => {
  const sampleDrive = {
    min_cgpa: 7.5,
    max_active_backlogs: 0,
    eligible_departments: ['Computer Science', 'Information Technology'],
    eligible_batch_years: [2025],
  };

  test('should return eligible when student meets all criteria', () => {
    const student = {
      cgpa: 8.5,
      active_backlogs: 0,
      department: 'Computer Science',
      batch_year: 2025,
    };

    const result = evaluateEligibility(student, sampleDrive);

    expect(result.isEligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  test('should return ineligible when CGPA is below minimum', () => {
    const student = {
      cgpa: 6.5,
      active_backlogs: 0,
      department: 'Computer Science',
      batch_year: 2025,
    };

    const result = evaluateEligibility(student, sampleDrive);

    expect(result.isEligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('should return ineligible when active backlogs exceed the limit', () => {
    const student = {
      cgpa: 8.5,
      active_backlogs: 2,
      department: 'Computer Science',
      batch_year: 2025,
    };

    const result = evaluateEligibility(student, sampleDrive);

    expect(result.isEligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('should return ineligible when department is not eligible', () => {
    const student = {
      cgpa: 8.5,
      active_backlogs: 0,
      department: 'Mechanical Engineering',
      batch_year: 2025,
    };

    const result = evaluateEligibility(student, sampleDrive);

    expect(result.isEligible).toBe(false);
  });

  test('should return ineligible when batch year is not eligible', () => {
    const student = {
      cgpa: 8.5,
      active_backlogs: 0,
      department: 'Computer Science',
      batch_year: 2026,
    };

    const result = evaluateEligibility(student, sampleDrive);

    expect(result.isEligible).toBe(false);
  });

  test('should reject invalid academic values and missing criteria', () => {
    expect(evaluateEligibility({ cgpa: 'bad', active_backlogs: 0, department: 'Computer Science', batch_year: 2025 }, sampleDrive).isEligible).toBe(false);
    expect(evaluateEligibility({ cgpa: 9, active_backlogs: 0, department: 'Computer Science', batch_year: 2025 }, { ...sampleDrive, eligible_departments: [] }).isEligible).toBe(false);
  });
});
