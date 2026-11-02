import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import {
  ApiResponse,
  Student,
  Tutor,
  DailyReport,
  MensaReport,
  MonthlyReport,
  AttendanceRecord,
  User,
  Project,
  ProjectReportData,
  AfterschoolAssignment,
  AfterschoolWeekSchedule,
  TeacherShift,
  ClosureDay,
  FinancialMonthlyReport,
  OperationalMonthlyReport,
  SystemSettings,
  AfterschoolPackage,
  AfterschoolTariff,
  CreateAfterschoolPackagePayload,
  TransitionTariffPayload,
  AfterschoolExpense,
  AfterschoolExpenseCategory,
  AfterschoolExpensesSummary,
  MonthlyBillingSummary,
  AssignPackagePayload,
  SettlePayload,
  AssignedTariff
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  // Studenti
  getStudents(): Observable<Student[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/students`).pipe(
      map(res => {
        if (!Array.isArray(res.data)) return [];
        return res.data.map(item => {
          const subDays = Array.isArray(item.giorni_abbonamento)
            ? item.giorni_abbonamento
            : (item.giorni_abbonamento ? String(item.giorni_abbonamento).split(',').map(Number) : [1, 2, 3, 4, 5]);

          return {
            id: item.student_id || item.id,
            first_name: item.student_first_name || item.first_name,
            last_name: item.student_last_name || item.last_name,
            school: item.scuola || item.school || 'Non specificata',
            birth_date: item.data_nascita || item.birth_date,
            birth_place: item.luogo_nascita || item.birth_place,
            created_at: item.created_at,
            sub_lun: subDays.includes(1),
            sub_mar: subDays.includes(2),
            sub_mer: subDays.includes(3),
            sub_gio: subDays.includes(4),
            sub_ven: subDays.includes(5),
            weekly_meals: item.pasti_settimanali !== undefined ? Number(item.pasti_settimanali) : (item.weekly_meals ?? 0),
            main_tutor_name: (item.tutor_first_name && item.tutor_last_name) ? `${item.tutor_first_name} ${item.tutor_last_name}` : item.main_tutor_name,
            main_tutor_phone: item.tutor_phone || item.main_tutor_phone
          };
        });
      }),
      catchError(err => {
        console.warn('Backend unavailable, using fallback mock students', err);
        return of(this.getMockStudents());
      })
    );
  }

  getStudentById(id: string | number): Observable<Student | null> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/students/${id}`).pipe(
      map(res => {
        if (!res.data) return null;
        const item = res.data;
        const tutors: Tutor[] = Array.isArray(item.tutors)
          ? item.tutors.map((t: any) => ({
              id: t.id,
              student_id: t.student_id,
              first_name: t.nome || t.first_name,
              last_name: t.cognome || t.last_name,
              phone: t.telefono || t.phone || '',
              email: t.email || '',
              is_main: !!t.is_main_contact || !!t.is_main,
              relationship: t.relationship || t.note || 'Genitore'
            }))
          : [];

        const subDays = Array.isArray(item.giorni_abbonamento) ? item.giorni_abbonamento : [1, 2, 3, 4, 5];

        return {
          id: item.id || id,
          first_name: item.nome || item.first_name,
          last_name: item.cognome || item.last_name,
          school: item.scuola || item.school || '',
          birth_date: item.data_nascita ? String(item.data_nascita).slice(0, 10) : (item.birth_date || ''),
          birth_place: item.luogo_nascita || item.birth_place || '',
          residence: item.residenza || item.residence || '',
          created_at: item.created_at,
          updated_at: item.updated_at,
          sub_lun: subDays.includes(1),
          sub_mar: subDays.includes(2),
          sub_mer: subDays.includes(3),
          sub_gio: subDays.includes(4),
          sub_ven: subDays.includes(5),
          weekly_meals: item.pasti_settimanali !== undefined ? Number(item.pasti_settimanali) : (item.weekly_meals ?? 0),
          main_tutor_name: tutors.find(t => t.is_main)?.first_name ? `${tutors.find(t => t.is_main)?.first_name} ${tutors.find(t => t.is_main)?.last_name}` : undefined,
          main_tutor_phone: tutors.find(t => t.is_main)?.phone,
          tutors
        } as Student;
      }),
      catchError(err => {
        console.warn('Backend unavailable, returning fallback student by id', err);
        return of(this.getMockStudents().find(s => s.id === id) || null);
      })
    );
  }

  updateStudent(id: string | number, studentData: Partial<Student>): Observable<Student> {
    const days: number[] = [];
    if (studentData.sub_lun) days.push(1);
    if (studentData.sub_mar) days.push(2);
    if (studentData.sub_mer) days.push(3);
    if (studentData.sub_gio) days.push(4);
    if (studentData.sub_ven) days.push(5);

    const weeklyMeals = Number(studentData.weekly_meals ?? 0);

    const payload = {
      student: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        scuola: studentData.school || '',
        data_nascita: studentData.birth_date || '2016-01-01',
        luogo_nascita: studentData.birth_place || '',
        residenza: studentData.residence || 'N/D',
        giorni_abbonamento: days,
        pasti_settimanali: isNaN(weeklyMeals) ? 0 : weeklyMeals
      },
      tutors: (studentData.tutors || []).map((t, idx) => ({
        first_name: t.first_name,
        last_name: t.last_name,
        phone: t.phone,
        email: t.email || '',
        is_main_contact: t.is_main !== undefined ? t.is_main : (idx === 0),
        relationship: t.relationship || 'Genitore',
        residenza: 'N/D'
      }))
    };

    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/students/${id}`, payload).pipe(
      map(res => ({
        id,
        ...studentData,
        weekly_meals: isNaN(weeklyMeals) ? 0 : weeklyMeals
      } as Student)),
      catchError(err => {
        console.warn('Backend unavailable, simulating mock update', err);
        return of({ id, ...studentData, weekly_meals: isNaN(weeklyMeals) ? 0 : weeklyMeals } as Student);
      })
    );
  }

  createStudent(studentData: Partial<Student>): Observable<Student> {
    const days: number[] = [];
    if (studentData.sub_lun) days.push(1);
    if (studentData.sub_mar) days.push(2);
    if (studentData.sub_mer) days.push(3);
    if (studentData.sub_gio) days.push(4);
    if (studentData.sub_ven) days.push(5);

    const weeklyMeals = Number(studentData.weekly_meals ?? 0);

    const payload = {
      student: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        scuola: studentData.school || '',
        data_nascita: studentData.birth_date || '2016-01-01',
        luogo_nascita: studentData.birth_place || '',
        residenza: studentData.residence || 'N/D',
        giorni_abbonamento: days,
        pasti_settimanali: isNaN(weeklyMeals) ? 0 : weeklyMeals
      },
      tutors: (studentData.tutors || []).map((t, idx) => ({
        first_name: t.first_name,
        last_name: t.last_name,
        phone: t.phone,
        email: t.email || '',
        is_main_contact: t.is_main !== undefined ? t.is_main : (idx === 0),
        relationship: t.relationship || 'Genitore'
      }))
    };

    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/students`, payload).pipe(
      map(res => ({
        id: res.data?.student_id || Math.floor(Math.random() * 1000) + 10,
        ...studentData,
        weekly_meals: isNaN(weeklyMeals) ? 0 : weeklyMeals
      } as Student)),
      catchError(err => {
        console.warn('Backend unavailable, simulating mock create', err);
        return of({ id: Math.floor(Math.random() * 1000) + 10, ...studentData, weekly_meals: isNaN(weeklyMeals) ? 0 : weeklyMeals } as Student);
      })
    );
  }

  // Presenze
  getExpectedAttendances(date: string): Observable<AttendanceRecord[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/attendances/expected`, { params }).pipe(
      map(res => {
        if (!Array.isArray(res.data)) return [];
        return res.data.map(item => ({
          student_id: item.student_id,
          first_name: item.first_name,
          last_name: item.last_name,
          school: item.scuola || item.school || '',
          main_tutor_phone: item.main_tutor_phone || item.tutor_phone || '',
          is_present: !!item.is_present,
          has_meal: !!item.canteen_used || !!item.has_meal,
          notes: item.notes || ''
        }));
      }),
      catchError(err => {
        console.warn('Backend unavailable, generating mock expected attendances', err);
        return of(this.getMockExpectedAttendances());
      })
    );
  }

  saveAttendancesBulk(date: string, records: AttendanceRecord[]): Observable<{ count: number }> {
    const payload = records.map(r => ({
      student_id: r.student_id,
      date,
      is_present: !!r.is_present,
      canteen_used: !!r.has_meal,
      notes: r.notes || ''
    }));

    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/attendances/bulk`, payload).pipe(
      map(res => ({ count: res.data?.records?.length || records.length })),
      catchError(err => {
        console.warn('Backend unavailable, simulating mock bulk save', err);
        return of({ count: records.length });
      })
    );
  }

  // Report
  getDailyReport(date: string): Observable<DailyReport> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/attendances`, { params }).pipe(
      map(res => {
        const d = res.data;
        return {
          date: d.date,
          statistics: {
            totalExpected: d.statistics?.totalExpected ?? 0,
            present: d.statistics?.present ?? 0,
            extraPresent: d.statistics?.extraPresent ?? 0,
            absent: d.statistics?.absent ?? 0,
            excused: d.statistics?.excused ?? 0,
            totalInserted: d.statistics?.totalInserted ?? (d.allAttendances?.length || 0)
          },
          allAttendances: (d.allAttendances || []).map((a: any) => ({
            attendance_id: a.attendance_id || a.id,
            date: a.date,
            student_id: a.student_id,
            first_name: a.first_name,
            last_name: a.last_name,
            studentName: a.studentName || `${a.first_name} ${a.last_name}`,
            school: a.school || '',
            is_present: !!a.is_present,
            is_absent_justified: !!a.is_absent_justified,
            canteen_used: !!a.canteen_used,
            is_extra: !!a.is_extra,
            created_at: a.created_at,
            updated_at: a.updated_at,
            tutor_name: a.tutor_name || 'N/D',
            tutor_phone: a.tutor_phone || ''
          })),
          extraStudents: (d.extraStudents || []).map((e: any) => ({
            student_id: e.student_id,
            first_name: e.first_name,
            last_name: e.last_name,
            studentName: e.studentName || `${e.first_name} ${e.last_name}`,
            school: e.school || '',
            has_meal: !!e.has_meal,
            tutor_name: e.tutor_name || 'N/D',
            tutor_phone: e.tutor_phone || ''
          })),
          unjustifiedAbsences: (d.unjustifiedAbsences || []).map((u: any) => ({
            student_id: u.student?.id || u.student_id,
            first_name: u.student?.firstName || u.first_name,
            last_name: u.student?.lastName || u.last_name,
            school: u.school || '',
            tutor_name: u.mainTutor?.fullName || u.tutor_name || 'N/D',
            tutor_phone: u.mainTutor?.phone || u.tutor_phone || ''
          }))
        };
      }),
      catchError(err => {
        console.warn('Backend unavailable, using mock daily report', err);
        return of(this.getMockDailyReport(date));
      })
    );
  }

  getMensaReport(yearOrFrom: number | string, monthOrTo: number | string): Observable<MensaReport> {
    let params = new HttpParams();
    let fallbackFrom = '';
    let fallbackTo = '';
    let parsedYear: number | undefined;
    let parsedMonth: number | undefined;

    if (typeof yearOrFrom === 'number' && typeof monthOrTo === 'number') {
      parsedYear = yearOrFrom;
      parsedMonth = monthOrTo;
      params = params.set('year', yearOrFrom.toString()).set('month', monthOrTo.toString());
      fallbackFrom = `${yearOrFrom}-${String(monthOrTo).padStart(2, '0')}-01`;
      const lastDay = new Date(yearOrFrom, monthOrTo, 0).getDate();
      fallbackTo = `${yearOrFrom}-${String(monthOrTo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      fallbackFrom = String(yearOrFrom);
      fallbackTo = String(monthOrTo);
      params = params.set('from', fallbackFrom).set('to', fallbackTo);
    }

    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/mensa`, { params }).pipe(
      map(res => {
        const d = res.data;
        return {
          year: d.year ?? parsedYear,
          month: d.month ?? parsedMonth,
          from: d.from || d.range?.from || fallbackFrom,
          to: d.to || d.range?.to || fallbackTo,
          total_meals: d.deliveredTotal ?? d.totalMensa ?? 0,
          delivered_regular: d.deliveredRegular ?? (d.totalMensa !== undefined && d.extraMensa !== undefined ? d.totalMensa - d.extraMensa : 0),
          delivered_extra: d.deliveredExtra ?? d.extraMensa ?? 0,
          expected_meals: d.expectedMeals ?? d.expectedMensa ?? 0,
          breakdown: (d.dailyBreakdown || []).map((b: any) => ({
            date: b.date,
            regular_meals: b.regularMensa ?? 0,
            extra_meals: b.extraMensa ?? 0,
            total_meals: b.totalMensa ?? 0,
            students: Array.isArray(b.students) ? b.students : []
          })),
          students_breakdown: (d.studentsBreakdown || []).map((s: any) => ({
            student_id: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
            studentName: s.studentName || `${s.first_name} ${s.last_name}`,
            school: s.school || '',
            weekly_meals: s.pasti_settimanali ?? 0,
            expected_meals: s.expectedMeals ?? 0,
            delivered_regular: s.deliveredRegular ?? 0,
            delivered_extra: s.deliveredExtra ?? 0,
            delivered_total: s.deliveredTotal ?? 0
          }))
        };
      }),
      catchError(err => {
        console.warn('Backend unavailable, using mock mensa report', err);
        return of(this.getMockMensaReport(fallbackFrom, fallbackTo, parsedYear, parsedMonth));
      })
    );
  }

  getMonthlyReport(year: number, month: number): Observable<MonthlyReport> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/monthly`, { params }).pipe(
      map(res => {
        const d = res.data;
        return {
          year: d.year,
          month: d.month,
          from: d.from,
          to: d.to,
          summary: {
            totalPresent: d.summary?.totalPresent ?? 0,
            totalExtraPresent: d.summary?.totalExtraPresent ?? 0,
            totalUnjustifiedAbsent: d.summary?.totalUnjustifiedAbsent ?? 0,
            totalExcused: d.summary?.totalExcused ?? 0,
            totalMeals: d.summary?.totalMeals ?? 0,
            activeDays: d.summary?.activeDays ?? 0
          },
          dailyTrend: (d.dailyTrend || []).map((r: any) => ({
            date: r.date,
            present: r.present ?? 0,
            extra: r.extra ?? 0,
            absent: r.absent ?? 0,
            excused: r.excused ?? 0,
            meals: r.meals ?? 0
          })),
          studentsSummary: (d.studentsSummary || []).map((s: any) => {
            const daysPresent = s.days_present ?? 0;
            const daysAbsent = s.days_absent ?? 0;
            const presenzePagate = s.presenze_pagate ?? 0;
            const eccedenza = s.eccedenza ?? ((daysPresent + daysAbsent) - presenzePagate);
            return {
              student_id: s.student_id,
              first_name: s.first_name,
              last_name: s.last_name,
              studentName: s.studentName || `${s.first_name} ${s.last_name}`,
              school: s.school || '',
              days_present: daysPresent,
              days_absent: daysAbsent,
              meals_count: s.meals_count ?? 0,
              presenze_pagate: presenzePagate,
              eccedenza: eccedenza
            };
          })
        } as MonthlyReport;
      }),
      catchError(err => {
        console.warn('Backend unavailable, using fallback mock monthly report', err);
        return of(this.getMockMonthlyReport(year, month));
      })
    );
  }

  saveMonthlyPlans(
    yearOrPayload: number | { year: number; month: number; plans: { student_id: number | string; presenze_pagate: number }[] },
    month?: number,
    plans?: { student_id: number | string; presenze_pagate: number }[]
  ): Observable<ApiResponse<any>> {
    let body: { year: number; month: number; plans: { student_id: number | string; presenze_pagate: number }[] };
    if (typeof yearOrPayload === 'object' && yearOrPayload !== null) {
      body = yearOrPayload;
    } else {
      body = { year: yearOrPayload, month: month!, plans: plans! };
    }
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/reports/monthly-plans`, body);
  }

  // Fallback Mocks
  private getMockStudents(): Student[] {
    return [
      {
        id: 1,
        first_name: 'Leonardo',
        last_name: 'Bianchi',
        school: 'Scuola Primaria Rodari',
        sub_lun: true,
        sub_mar: true,
        sub_mer: true,
        sub_gio: true,
        sub_ven: true,
        weekly_meals: 5,
        main_tutor_name: 'Marco Bianchi',
        main_tutor_phone: '+39 340 1234567'
      }
    ];
  }

  private getMockExpectedAttendances(): AttendanceRecord[] {
    return [
      { student_id: 1, first_name: 'Leonardo', last_name: 'Bianchi', school: 'Scuola Primaria Rodari', is_present: true, has_meal: true }
    ];
  }

  private getMockDailyReport(date: string): DailyReport {
    return {
      date,
      statistics: { totalExpected: 18, present: 14, extraPresent: 0, absent: 4, excused: 0 },
      extraStudents: [],
      unjustifiedAbsences: []
    };
  }

  private getMockMensaReport(from: string, to: string, year?: number, month?: number): MensaReport {
    return {
      year,
      month,
      from,
      to,
      total_meals: 42,
      delivered_regular: 42,
      delivered_extra: 0,
      expected_meals: 44,
      breakdown: [],
      students_breakdown: []
    };
  }

  private getMockMonthlyReport(year: number, month: number): MonthlyReport {
    return {
      year,
      month,
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-28`,
      summary: {
        totalPresent: 50,
        totalExtraPresent: 0,
        totalUnjustifiedAbsent: 5,
        totalExcused: 0,
        totalMeals: 45,
        activeDays: 15
      },
      dailyTrend: [],
      studentsSummary: [
        {
          student_id: 1,
          first_name: 'Leonardo',
          last_name: 'Bianchi',
          studentName: 'Leonardo Bianchi',
          school: 'Scuola Primaria Rodari',
          days_present: 15,
          days_absent: 2,
          meals_count: 15,
          presenze_pagate: 16,
          eccedenza: 1 // (15 + 2) - 16 = 1
        }
      ]
    };
  }

  // ================= USERS API =================
  getUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.baseUrl}/users`).pipe(
      map(res => res.data || [])
    );
  }

  getUserById(id: string | number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/users/${id}`).pipe(
      map(res => res.data)
    );
  }

  createUser(userData: Partial<User> & { password?: string }): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.baseUrl}/users`, userData).pipe(
      map(res => res.data)
    );
  }

  updateUser(id: string | number, userData: Partial<User> & { password?: string }): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.baseUrl}/users/${id}`, userData).pipe(
      map(res => res.data)
    );
  }

  deleteUser(id: string | number): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/users/${id}`).pipe(
      map(res => res.success)
    );
  }

  // ================= PROJECTS API =================
  getProjects(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.baseUrl}/projects`).pipe(
      map(res => res.data || [])
    );
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<ApiResponse<Project>>(`${this.baseUrl}/projects/${id}`).pipe(
      map(res => res.data)
    );
  }

  createProject(projectData: Partial<Project>): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(`${this.baseUrl}/projects`, projectData).pipe(
      map(res => res.data)
    );
  }

  updateProject(id: string, projectData: Partial<Project>): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(`${this.baseUrl}/projects/${id}`, projectData).pipe(
      map(res => res.data)
    );
  }

  deleteProject(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/projects/${id}`).pipe(
      map(res => res.success)
    );
  }

  assignTeacherToProject(projectId: string, data: { user_id: string; hourly_rate?: number | null; assigned_hours?: number | null }): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/projects/${projectId}/teachers`, data).pipe(
      map(res => res.data)
    );
  }

  removeTeacherFromProject(projectId: string, userId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/projects/${projectId}/teachers/${userId}`).pipe(
      map(res => res.success)
    );
  }

  // ================= REPORTS API =================
  getProjectsReport(): Observable<ProjectReportData> {
    return this.http.get<ApiResponse<ProjectReportData>>(`${this.baseUrl}/reports/projects`).pipe(
      map(res => res.data)
    );
  }

  getFinancialMonthlyReport(year: number, month: number): Observable<FinancialMonthlyReport> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http.get<ApiResponse<FinancialMonthlyReport>>(`${this.baseUrl}/reports/financial-monthly`, { params }).pipe(
      map(res => res.data)
    );
  }

  getOperationalMonthlyReport(year: number, month: number): Observable<OperationalMonthlyReport> {
    const params = new HttpParams().set('year', year.toString()).set('month', month.toString());
    return this.http.get<ApiResponse<OperationalMonthlyReport>>(`${this.baseUrl}/reports/operational-monthly`, { params }).pipe(
      map(res => res.data)
    );
  }

  // ================= SETTINGS API =================
  getSystemSettings(): Observable<{ list: any[]; settings: SystemSettings }> {
    return this.http.get<ApiResponse<{ list: any[]; settings: SystemSettings }>>(`${this.baseUrl}/settings`).pipe(
      map(res => res.data)
    );
  }

  updateSystemSettings(settings: Partial<SystemSettings>): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/settings`, settings).pipe(
      map(res => res.data)
    );
  }

  // ================= AFTERSCHOOL COMMESSA SPECIALE API =================
  getAfterschoolAssignments(): Observable<AfterschoolAssignment[]> {
    return this.http.get<ApiResponse<AfterschoolAssignment[]>>(`${this.baseUrl}/afterschool/assignments`).pipe(
      map(res => res.data || [])
    );
  }

  getAfterschoolAssignmentByUser(userId: string): Observable<AfterschoolAssignment | null> {
    return this.http.get<ApiResponse<AfterschoolAssignment | null>>(`${this.baseUrl}/afterschool/assignments/${userId}`).pipe(
      map(res => res.data || null)
    );
  }

  assignAfterschool(data: { user_id: string; hourly_rate: number; notes?: string | null }): Observable<AfterschoolAssignment> {
    return this.http.post<ApiResponse<AfterschoolAssignment>>(`${this.baseUrl}/afterschool/assignments`, data).pipe(
      map(res => res.data)
    );
  }

  removeAfterschoolAssignment(userId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/afterschool/assignments/${userId}`).pipe(
      map(res => res.success)
    );
  }

  // ================= CALENDARIO SETTIMANALE DOPOSCUOLA & TURNI TEACHER =================
  getAfterschoolWeekSchedule(startDate: string): Observable<AfterschoolWeekSchedule> {
    const params = new HttpParams().set('startDate', startDate);
    return this.http.get<ApiResponse<AfterschoolWeekSchedule>>(`${this.baseUrl}/afterschool/week-summary`, { params }).pipe(
      map(res => res.data)
    );
  }

  createTeacherShift(data: { user_id: string; shift_date: string; start_time: string; end_time: string; notes?: string }): Observable<TeacherShift> {
    return this.http.post<ApiResponse<TeacherShift>>(`${this.baseUrl}/afterschool/shifts`, data).pipe(
      map(res => res.data)
    );
  }

  updateTeacherShift(id: string, data: { user_id?: string; shift_date?: string; start_time?: string; end_time?: string; notes?: string }): Observable<TeacherShift> {
    return this.http.put<ApiResponse<TeacherShift>>(`${this.baseUrl}/afterschool/shifts/${id}`, data).pipe(
      map(res => res.data)
    );
  }

  deleteTeacherShift(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/afterschool/shifts/${id}`).pipe(
      map(res => res.success)
    );
  }

  // ================= CHIUSURE STRAORDINARIE (SOLO ADMIN) =================
  getAfterschoolClosures(): Observable<ClosureDay[]> {
    return this.http.get<ApiResponse<ClosureDay[]>>(`${this.baseUrl}/afterschool/closures`).pipe(
      map(res => res.data || [])
    );
  }

  createAfterschoolClosure(data: { date: string; title: string; notes?: string | null }): Observable<ClosureDay> {
    return this.http.post<ApiResponse<ClosureDay>>(`${this.baseUrl}/afterschool/closures`, data).pipe(
      map(res => res.data)
    );
  }

  deleteAfterschoolClosure(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(`${this.baseUrl}/afterschool/closures/${id}`).pipe(
      map(res => res.success)
    );
  }

  // ================= PACCHETTI E TARIFFE DOPOSCUOLA (SOLO ADMIN) =================
  getAfterschoolPackages(referenceDate?: string): Observable<AfterschoolPackage[]> {
    let params = new HttpParams();
    if (referenceDate) {
      params = params.set('reference_date', referenceDate);
    }
    return this.http.get<ApiResponse<AfterschoolPackage[]>>(`${this.baseUrl}/afterschool-packages`, { params }).pipe(
      map(res => res.data || [])
    );
  }

  getPackageTariffs(packageId: string): Observable<AfterschoolTariff[]> {
    return this.http.get<ApiResponse<AfterschoolTariff[]>>(`${this.baseUrl}/afterschool-packages/${packageId}/tariffs`).pipe(
      map(res => res.data || [])
    );
  }

  createAfterschoolPackage(payload: CreateAfterschoolPackagePayload): Observable<AfterschoolPackage> {
    return this.http.post<ApiResponse<AfterschoolPackage>>(`${this.baseUrl}/afterschool-packages`, payload).pipe(
      map(res => res.data)
    );
  }

  updateAfterschoolPackage(id: string, payload: Partial<AfterschoolPackage>): Observable<AfterschoolPackage> {
    return this.http.put<ApiResponse<AfterschoolPackage>>(`${this.baseUrl}/afterschool-packages/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  updateAfterschoolTariff(tariffId: string, payload: Partial<AfterschoolTariff>): Observable<AfterschoolTariff> {
    return this.http.put<ApiResponse<AfterschoolTariff>>(`${this.baseUrl}/afterschool-packages/tariffs/${tariffId}`, payload).pipe(
      map(res => res.data)
    );
  }

  transitionAfterschoolTariff(packageId: string, payload: TransitionTariffPayload): Observable<{ oldTariff: AfterschoolTariff; newTariff: AfterschoolTariff }> {
    return this.http.post<ApiResponse<{ oldTariff: AfterschoolTariff; newTariff: AfterschoolTariff }>>(
      `${this.baseUrl}/afterschool-packages/${packageId}/transition-tariff`,
      payload
    ).pipe(
      map(res => res.data)
    );
  }

  // ================= NOTE SPESE DOPOSCUOLA (MENSA & ALTRO) =================
  getAfterschoolExpenses(year: number, month: number, category?: AfterschoolExpenseCategory): Observable<{ summary: AfterschoolExpensesSummary; expenses: AfterschoolExpense[] }> {
    let params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<ApiResponse<{ summary: AfterschoolExpensesSummary; expenses: AfterschoolExpense[] }>>(
      `${this.baseUrl}/afterschool/expenses`,
      { params }
    ).pipe(
      map(res => res.data)
    );
  }

  createAfterschoolExpense(payload: {
    expense_date: string;
    category: AfterschoolExpenseCategory;
    amount: number;
    description?: string;
  }): Observable<AfterschoolExpense> {
    return this.http.post<ApiResponse<AfterschoolExpense>>(
      `${this.baseUrl}/afterschool/expenses`,
      payload
    ).pipe(
      map(res => res.data)
    );
  }

  updateAfterschoolExpense(
    id: string,
    payload: {
      expense_date?: string;
      category?: AfterschoolExpenseCategory;
      amount?: number;
      description?: string;
    }
  ): Observable<AfterschoolExpense> {
    return this.http.put<ApiResponse<AfterschoolExpense>>(
      `${this.baseUrl}/afterschool/expenses/${id}`,
      payload
    ).pipe(
      map(res => res.data)
    );
  }

  deleteAfterschoolExpense(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<{ message: string }>>(
      `${this.baseUrl}/afterschool/expenses/${id}`
    ).pipe(
      map(res => res.success)
    );
  }

  // ================= GESTIONE PAGAMENTI STUDENTI =================
  getMonthlyBilling(year: number, month: number): Observable<MonthlyBillingSummary> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    return this.http.get<ApiResponse<MonthlyBillingSummary>>(`${this.baseUrl}/payments/monthly`, { params }).pipe(
      map(res => res.data)
    );
  }

  assignTariffToStudent(payload: AssignPackagePayload): Observable<AssignedTariff> {
    return this.http.post<ApiResponse<AssignedTariff>>(`${this.baseUrl}/payments/assign-tariff`, payload).pipe(
      map(res => res.data)
    );
  }

  removeStudentTariff(assignmentId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/payments/tariffs/${assignmentId}`).pipe(
      map(res => res.success)
    );
  }

  settleMonthlyPayments(payload: SettlePayload): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/payments/settle`, payload).pipe(
      map(res => res.data)
    );
  }
}


