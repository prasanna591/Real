export interface EMIResult {
  monthlyEmi: number;
  totalInterest: number;
  totalAmount: number;
}

export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureYears: number,
): EMIResult {
  if (principal <= 0 || annualRate <= 0 || tenureYears <= 0) {
    return { monthlyEmi: 0, totalInterest: 0, totalAmount: 0 };
  }

  const monthlyRate = annualRate / 12 / 100;
  const tenureMonths = tenureYears * 12;

  if (monthlyRate === 0) {
    const emi = principal / tenureMonths;
    return { monthlyEmi: emi, totalInterest: 0, totalAmount: principal };
  }

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const totalAmount = emi * tenureMonths;
  const totalInterest = totalAmount - principal;

  return { monthlyEmi: emi, totalInterest, totalAmount };
}

export function formatEMIPrice(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
