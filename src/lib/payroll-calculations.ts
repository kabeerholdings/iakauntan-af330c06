// Malaysian statutory calculation helpers

// EPF contribution rates (2024/2025)
export const calculateEPF = (salary: number, employeeRate: number, employerRate: number) => {
  const employee = Math.round(salary * employeeRate / 100);
  const employer = Math.round(salary * employerRate / 100);
  return { employee, employer };
};

// SOCSO contribution table (simplified - Category 1)
// Based on wage brackets. Using simplified calculation for web app.
const socsoTable = [
  { max: 30, empCat1: 0.10, erCat1: 0.40, empCat2: 0, erCat2: 0.30 },
  { max: 50, empCat1: 0.15, erCat1: 0.60, empCat2: 0, erCat2: 0.45 },
  { max: 70, empCat1: 0.25, erCat1: 0.85, empCat2: 0, erCat2: 0.65 },
  { max: 100, empCat1: 0.35, erCat1: 1.25, empCat2: 0, erCat2: 0.95 },
  { max: 140, empCat1: 0.50, erCat1: 1.75, empCat2: 0, erCat2: 1.35 },
  { max: 200, empCat1: 0.70, erCat1: 2.45, empCat2: 0, erCat2: 1.85 },
  { max: 300, empCat1: 1.05, erCat1: 3.65, empCat2: 0, erCat2: 2.80 },
  { max: 400, empCat1: 1.45, erCat1: 5.05, empCat2: 0, erCat2: 3.85 },
  { max: 500, empCat1: 1.85, erCat1: 6.45, empCat2: 0, erCat2: 4.95 },
  { max: 600, empCat1: 2.25, erCat1: 7.85, empCat2: 0, erCat2: 6.00 },
  { max: 700, empCat1: 2.65, erCat1: 9.25, empCat2: 0, erCat2: 7.10 },
  { max: 800, empCat1: 3.05, erCat1: 10.65, empCat2: 0, erCat2: 8.15 },
  { max: 900, empCat1: 3.45, erCat1: 12.05, empCat2: 0, erCat2: 9.25 },
  { max: 1000, empCat1: 3.85, erCat1: 13.45, empCat2: 0, erCat2: 10.30 },
  { max: 1100, empCat1: 4.25, erCat1: 14.85, empCat2: 0, erCat2: 11.40 },
  { max: 1200, empCat1: 4.65, erCat1: 16.25, empCat2: 0, erCat2: 12.45 },
  { max: 1300, empCat1: 5.05, erCat1: 17.65, empCat2: 0, erCat2: 13.55 },
  { max: 1400, empCat1: 5.45, erCat1: 19.05, empCat2: 0, erCat2: 14.60 },
  { max: 1500, empCat1: 5.85, erCat1: 20.45, empCat2: 0, erCat2: 15.70 },
  { max: 1600, empCat1: 6.25, erCat1: 21.85, empCat2: 0, erCat2: 16.75 },
  { max: 1700, empCat1: 6.65, erCat1: 23.25, empCat2: 0, erCat2: 17.85 },
  { max: 1800, empCat1: 7.05, erCat1: 24.65, empCat2: 0, erCat2: 18.90 },
  { max: 1900, empCat1: 7.45, erCat1: 26.05, empCat2: 0, erCat2: 20.00 },
  { max: 2000, empCat1: 7.85, erCat1: 27.45, empCat2: 0, erCat2: 21.05 },
  { max: 2100, empCat1: 8.25, erCat1: 28.85, empCat2: 0, erCat2: 22.15 },
  { max: 2200, empCat1: 8.65, erCat1: 30.25, empCat2: 0, erCat2: 23.20 },
  { max: 2300, empCat1: 9.05, erCat1: 31.65, empCat2: 0, erCat2: 24.30 },
  { max: 2400, empCat1: 9.45, erCat1: 33.05, empCat2: 0, erCat2: 25.35 },
  { max: 2500, empCat1: 9.85, erCat1: 34.45, empCat2: 0, erCat2: 26.45 },
  { max: 2600, empCat1: 10.25, erCat1: 35.85, empCat2: 0, erCat2: 27.50 },
  { max: 2700, empCat1: 10.65, erCat1: 37.25, empCat2: 0, erCat2: 28.60 },
  { max: 2800, empCat1: 11.05, erCat1: 38.65, empCat2: 0, erCat2: 29.65 },
  { max: 2900, empCat1: 11.45, erCat1: 40.05, empCat2: 0, erCat2: 30.75 },
  { max: 3000, empCat1: 11.85, erCat1: 41.45, empCat2: 0, erCat2: 31.80 },
  { max: 3100, empCat1: 12.25, erCat1: 42.85, empCat2: 0, erCat2: 32.90 },
  { max: 3200, empCat1: 12.65, erCat1: 44.25, empCat2: 0, erCat2: 33.95 },
  { max: 3300, empCat1: 13.05, erCat1: 45.65, empCat2: 0, erCat2: 35.05 },
  { max: 3400, empCat1: 13.45, erCat1: 47.05, empCat2: 0, erCat2: 36.10 },
  { max: 3500, empCat1: 13.85, erCat1: 48.45, empCat2: 0, erCat2: 37.20 },
  { max: 3600, empCat1: 14.25, erCat1: 49.85, empCat2: 0, erCat2: 38.25 },
  { max: 3700, empCat1: 14.65, erCat1: 51.25, empCat2: 0, erCat2: 39.35 },
  { max: 3800, empCat1: 15.05, erCat1: 52.65, empCat2: 0, erCat2: 40.40 },
  { max: 3900, empCat1: 15.45, erCat1: 54.05, empCat2: 0, erCat2: 41.50 },
  { max: 4000, empCat1: 15.85, erCat1: 55.45, empCat2: 0, erCat2: 42.55 },
  { max: 5000, empCat1: 19.75, erCat1: 69.05, empCat2: 0, erCat2: 49.40 },
];

export const calculateSOCSO = (salary: number, category: string) => {
  // For wages above RM5000, use percentage-based
  if (salary > 5000) {
    if (category === '1') {
      return { employee: Math.round(salary * 0.005 * 100) / 100, employer: Math.round(salary * 0.0175 * 100) / 100 };
    }
    return { employee: 0, employer: Math.round(salary * 0.01235 * 100) / 100 };
  }
  
  const bracket = socsoTable.find(b => salary <= b.max) || socsoTable[socsoTable.length - 1];
  if (category === '1') {
    return { employee: bracket.empCat1, employer: bracket.erCat1 };
  }
  return { employee: bracket.empCat2, employer: bracket.erCat2 };
};

// EIS contribution (0.2% each, max wage RM5000)
export const calculateEIS = (salary: number) => {
  const cappedSalary = Math.min(salary, 5000);
  const contribution = Math.round(cappedSalary * 0.002 * 100) / 100;
  return { employee: contribution, employer: contribution };
};

// Simplified PCB (Monthly Tax Deduction) calculation
// This is a very simplified version. Real PCB uses complex tax tables.
export const calculatePCB = (annualIncome: number, taxStatus: string, epfContribution: number) => {
  // Deductions
  const personalRelief = 9000;
  const epfRelief = Math.min(epfContribution * 12, 4000);
  const socsoRelief = 350; // simplified
  const spouseRelief = taxStatus.includes('married') && !taxStatus.includes('working') ? 4000 : 0;
  
  const taxableIncome = Math.max(0, annualIncome - personalRelief - epfRelief - socsoRelief - spouseRelief);
  
  // Malaysian tax brackets 2024
  let tax = 0;
  if (taxableIncome <= 5000) tax = 0;
  else if (taxableIncome <= 20000) tax = (taxableIncome - 5000) * 0.01;
  else if (taxableIncome <= 35000) tax = 150 + (taxableIncome - 20000) * 0.03;
  else if (taxableIncome <= 50000) tax = 600 + (taxableIncome - 35000) * 0.06;
  else if (taxableIncome <= 70000) tax = 1500 + (taxableIncome - 50000) * 0.11;
  else if (taxableIncome <= 100000) tax = 3700 + (taxableIncome - 70000) * 0.19;
  else if (taxableIncome <= 400000) tax = 9400 + (taxableIncome - 100000) * 0.25;
  else if (taxableIncome <= 600000) tax = 84400 + (taxableIncome - 400000) * 0.26;
  else if (taxableIncome <= 2000000) tax = 136400 + (taxableIncome - 600000) * 0.28;
  else tax = 528400 + (taxableIncome - 2000000) * 0.30;
  
  // Rebate for taxable income <= 35000
  if (taxableIncome <= 35000) tax = Math.max(0, tax - 400);
  
  const monthlyPCB = Math.round(tax / 12 * 100) / 100;
  return monthlyPCB;
};

// HRDF levy (1% for companies with 10+ employees, 0.5% for 5-9)
export const calculateHRDF = (salary: number, employeeCount: number) => {
  if (employeeCount >= 10) return Math.round(salary * 0.01 * 100) / 100;
  if (employeeCount >= 5) return Math.round(salary * 0.005 * 100) / 100;
  return 0;
};
