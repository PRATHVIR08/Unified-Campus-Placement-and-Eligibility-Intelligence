import React from 'react';

// Eligibility Status Badge Component [P1]
export default function EligibilityBadge({ isEligible, reasons = [] }) {
  return (
    <div className="eligibility-container">
      <span className={`eligibility-badge ${isEligible ? 'eligible' : 'ineligible'}`}>
        {isEligible ? 'Eligible' : 'Not Eligible'}
      </span>
      {!isEligible && reasons.length > 0 && (
        <ul className="ineligible-reasons">
          {reasons.map((reason, index) => (
            <li key={index}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
