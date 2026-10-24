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
  weekly_meals?: number;
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
  notes?: string;
}

export interface AttendanceStats {
  totalExpected: number;
  present: number;
  extraPresent?: number;
  absent: number;
  excused?: number;
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
  is_absent_justified?: boolean;
  canteen_used: boolean;
  is_extra?: boolean;
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
  regular_meals?: number;
  extra_meals?: number;
  total_meals: number;
  students: { id: number | string; name: string }[];
}

export interface MensaStudentBreakdown {
  student_id: number | string;
  first_name: string;
  last_name: string;
  studentName: string;
  school: string;
  weekly_meals: number;
  expected_meals: number;
  delivered_regular: number;
  delivered_extra: number;
  delivered_total: number;
}

export interface MensaReport {
  year?: number;
  month?: number;
  from: string;
  to: string;
  total_meals: number;
  delivered_regular: number;
  delivered_extra: number;
  expected_meals: number;
  breakdown: MensaReportDay[];
  students_breakdown?: MensaStudentBreakdown[];
}

export interface MonthlyTrendDay {
  date: string;
  present: number;
  extra?: number;
  absent: number;
  excused?: number;
  meals: number;
}

export interface MonthlyStudentSummary {
  student_id: number | string;
  first_name: string;
  last_name: string;
  studentName?: string;
  school?: string;
  days_present: number;
  extra_days?: number;
  days_absent: number;
  days_excused?: number;
  meals_count: number;
  presenze_pagate: number;
  eccedenza: number;
}

export interface MonthlyReportSummary {
  totalPresent: number;
  totalExtraPresent?: number;
  totalUnjustifiedAbsent: number;
  totalExcused?: number;
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

export interface MonthlyPlanItem {
  student_id: number | string;
  presenze_pagate: number;
}

export type UserGroup = 'ADMIN' | 'OFFICE' | 'TEACHER';
export type UserRole = UserGroup | 'STAFF';

export interface User {
  id: string | number;
  name?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  groups?: UserGroup[];
  role?: UserRole;
  token?: string;
  afterschool_assignment?: AfterschoolAssignment | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTeacher {
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  hourly_rate?: number | null;
  assigned_hours?: number | null;
  total_cost?: number;
}

export interface Project {
  id: string;
  title: string;
  type?: string;
  enrollment_fee?: number | null;
  max_enrolled?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  location?: string | null;
  teachers_count?: number;
  total_assigned_hours?: number;
  total_cost?: number;
  teachers?: ProjectTeacher[];
  created_at?: string;
  updated_at?: string;
}

export interface AfterschoolAssignment {
  id?: string;
  user_id: string;
  hourly_rate: number;
  notes?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectReportSummary {
  total_projects: number;
  total_hours: number;
  total_cost: number;
}

export interface ProjectReportData {
  summary: ProjectReportSummary;
  projects: {
    id: string;
    title: string;
    location?: string;
    total_hours: number;
    total_cost: number;
    teachers: ProjectTeacher[];
  }[];
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
    first_name?: string;
    last_name?: string;
    nome?: string;
    cognome?: string;
    phone?: string;
    groups?: UserGroup[];
    role?: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TeacherShift {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AfterschoolStudentScheduleItem {
  student_id: string | number;
  first_name: string;
  last_name: string;
  school?: string;
  is_present?: boolean;
  has_meal: boolean;
  canteen_used?: boolean;
  already_registered?: boolean;
}

export interface ClosureDay {
  id: string;
  date: string;
  title: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AfterschoolWeekDay {
  date: string;
  day_name: string;
  closure?: ClosureDay | null;
  shifts: TeacherShift[];
  students: AfterschoolStudentScheduleItem[];
  total_teacher_hours: number;
  expected_students_count: number;
  meals_count: number;
}

export interface AfterschoolWeekSchedule {
  week_start: string;
  week_end: string;
  days: AfterschoolWeekDay[];
}

