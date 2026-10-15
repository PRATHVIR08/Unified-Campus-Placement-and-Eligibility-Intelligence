import React from 'react';

// Placement Officer Rule Builder Component [P1]
// Configures CGPA threshold, backlog limit, branches, and batch years for a job drive
export default function RuleBuilder({ criteria, onChange }) {
  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...criteria, [field]: value });
    }
  };

  return (
    <div className="rule-builder-card">
      <h3>Drive Eligibility Rule Configuration</h3>
      <div className="form-group">
        <label>Minimum CGPA Requirement</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={criteria?.minCgpa || 6.0}
          onChange={(e) => handleChange('minCgpa', parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label>Maximum Active Backlogs Permitted</label>
        <input
          type="number"
          min="0"
          value={criteria?.maxActiveBacklogs || 0}
          onChange={(e) => handleChange('maxActiveBacklogs', parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
}
