export interface AssignedTariff {
  id: string;
  student_id: number;
  year: number;
  month: number;
  package_id: string;
  package_name: string;
  package_code?: string | null;
  tariff_id: string;
  amount_paid: number;
  covered_days: number;
  assigned_at?: string;
  notes?: string | null;
}

export interface StudentMonthlyBilling {
  student_id: number;
  first_name: string;
  last_name: string;
  school?: string | null;
  assigned_packages: AssignedTariff[];
  total_paid_packages: number;
  total_covered_days: number;
  days_present: number;
  extra_days_count: number;
  extra_days_unit_fee: number;
  extra_days_total: number;
  extra_paid: boolean;
  extra_paid_at?: string | null;
  meals_count: number;
  meal_unit_fee: number;
  meals_total: number;
  meals_paid: boolean;
  meals_paid_at?: string | null;
  payment_method?: string | null;
  total_due_month: number;
  notes?: string | null;
}

export interface MonthlyBillingSummary {
  year: number;
  month: number;
  unit_rates: {
    one_off_fee: number;
    meal_fee_student: number;
  };
  totals: {
    total_students: number;
    total_packages_revenue: number;
    total_extra_pending: number;
    total_extra_collected: number;
    total_meals_pending: number;
    total_meals_collected: number;
    grand_total_potential: number;
  };
  students: StudentMonthlyBilling[];
}

export interface AssignPackagePayload {
  student_id: number;
  year: number;
  month: number;
  package_id: string;
  notes?: string | null;
}

export interface SettlePayload {
  student_id: number;
  year: number;
  month: number;
  settle_extra?: boolean;
  settle_meals?: boolean;
  payment_method?: string | null;
  notes?: string | null;
}
