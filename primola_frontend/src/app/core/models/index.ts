export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}

export interface Student {
  id: number | string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  birth_place?: string | null;
  school?: string | null;
  residence?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  sub_lun?: boolean;
  sub_mar?: boolean;
  sub_mer?: boolean;
  sub_gio?: boolean;
  sub_ven?: boolean;
  main_tutor_name?: string;
  main_tutor_phone?: string;
  tutors?: Tutor[];
}

export interface Tutor {
  id?: number | string;
  student_id?: number | string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  is_main: boolean;
  relationship?: string;
}

export interface AttendanceRecord {
  student_id: number | string;
  first_name: string;
  last_name: string;
  school?: string;
  main_tutor_phone?: string;
  is_present: boolean;
  has_meal: boolean;
  is_excused: boolean;
  notes?: string;
  is_extra?: boolean;
}

export interface AttendanceStats {
  totalExpected: number;
  present: number;
  extraPresent?: number;
  absent: number;
  excused: number;
  totalInserted?: number;
}

export interface AttendanceAuditItem {
  attendance_id: string | number;
  date: string;
  student_id: string | number;
  first_name: string;
  last_name: string;
  studentName?: string;
  school?: string;
  is_present: boolean;
  is_absent_justified: boolean;
  canteen_used: boolean;
  is_extra: boolean;
  created_at?: string;
  updated_at?: string;
  tutor_name?: string;
  tutor_phone?: string;
}

export interface ExtraStudent {
  student_id: number | string;
  first_name: string;
  last_name: string;
  studentName?: string;
  school?: string;
  has_meal: boolean;
  tutor_name?: string;
  tutor_phone?: string;
}

export interface UnjustifiedAbsence {
  student_id: number;
  first_name: string;
  last_name: string;
  school?: string;
  tutor_name: string;
  tutor_phone: string;
}

export interface DailyReport {
  date: string;
  statistics: AttendanceStats;
  allAttendances?: AttendanceAuditItem[];
  extraStudents?: ExtraStudent[];
  unjustifiedAbsences: UnjustifiedAbsence[];
}

export interface MensaReportDay {
  date: string;
  total_meals: number;
  students: { id: number; name: string }[];
}

export interface MensaReport {
  from: string;
  to: string;
  total_meals: number;
  breakdown: MensaReportDay[];
}

export interface MonthlyTrendDay {
  date: string;
  present: number;
  extra: number;
  absent: number;
  excused: number;
  meals: number;
}

export interface MonthlyStudentSummary {
  student_id: number | string;
  first_name: string;
  last_name: string;
  studentName?: string;
  school?: string;
  days_present: number;
  extra_days: number;
  days_absent: number;
  days_excused: number;
  meals_count: number;
}

export interface MonthlyReportSummary {
  totalPresent: number;
  totalExtraPresent: number;
  totalUnjustifiedAbsent: number;
  totalExcused: number;
  totalMeals: number;
  activeDays: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  from: string;
  to: string;
  summary: MonthlyReportSummary;
  dailyTrend: MonthlyTrendDay[];
  studentsSummary: MonthlyStudentSummary[];
}

export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: number | string;
  name: string;
  email?: string;
  role: UserRole;
  token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: {
    id: string | number;
    email: string;
    nome: string;
    cognome?: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}
