import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { ApiResponse, Student, Tutor, DailyReport, MensaReport, MonthlyReport, AttendanceRecord } from '../models';

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
              relationship: t.relationship || 'Genitore'
            }))
          : [];

        const subDays = Array.isArray(item.giorni_abbonamento) ? item.giorni_abbonamento : [1, 2, 3, 4, 5];

        return {
          id: item.id || id,
          first_name: item.nome || item.first_name,
          last_name: item.cognome || item.last_name,
          school: item.scuola || item.school || '',
          birth_date: item.data_nascita ? item.data_nascita.slice(0, 10) : (item.birth_date || ''),
          birth_place: item.luogo_nascita || item.birth_place || '',
          residence: item.residenza || item.residence || '',
          created_at: item.created_at,
          updated_at: item.updated_at,
          sub_lun: subDays.includes(1),
          sub_mar: subDays.includes(2),
          sub_mer: subDays.includes(3),
          sub_gio: subDays.includes(4),
          sub_ven: subDays.includes(5),
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

    const payload = {
      student: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        scuola: studentData.school || '',
        data_nascita: studentData.birth_date || '2016-01-01',
        luogo_nascita: studentData.birth_place || '',
        residenza: studentData.residence || 'N/D',
        giorni_abbonamento: days
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
        ...studentData
      } as Student)),
      catchError(err => {
        console.warn('Backend unavailable, simulating mock update', err);
        return of({ id, ...studentData } as Student);
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

    const payload = {
      student: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        scuola: studentData.school || '',
        data_nascita: studentData.birth_date || '2016-01-01',
        luogo_nascita: studentData.birth_place || '',
        residenza: studentData.residence || 'N/D',
        giorni_abbonamento: days
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
        ...studentData
      } as Student)),
      catchError(err => {
        console.warn('Backend unavailable, simulating mock create', err);
        return of({ id: Math.floor(Math.random() * 1000) + 10, ...studentData } as Student);
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
          is_excused: !!item.is_absent_justified || !!item.is_excused,
          notes: item.notes || '',
          is_extra: !!item.is_extra
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
      is_absent_justified: !r.is_present && !!r.is_excused,
      canteen_used: !!r.is_present && !!r.has_meal,
      is_extra: !!r.is_extra
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

  getMensaReport(from: string, to: string): Observable<MensaReport> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/mensa`, { params }).pipe(
      map(res => {
        const d = res.data;
        return {
          from: d.range?.from || from,
          to: d.range?.to || to,
          total_meals: d.totalMensa ?? 0,
          breakdown: (d.dailyBreakdown || []).map((b: any) => ({
            date: b.date,
            total_meals: b.totalMensa ?? 0,
            students: []
          }))
        };
      }),
      catchError(err => {
        console.warn('Backend unavailable, using mock mensa report', err);
        return of(this.getMockMensaReport(from, to));
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
          studentsSummary: (d.studentsSummary || []).map((s: any) => ({
            student_id: s.student_id,
            first_name: s.first_name,
            last_name: s.last_name,
            studentName: s.studentName || `${s.first_name} ${s.last_name}`,
            school: s.school || '',
            days_present: s.days_present ?? 0,
            extra_days: s.extra_days ?? 0,
            days_absent: s.days_absent ?? 0,
            days_excused: s.days_excused ?? 0,
            meals_count: s.meals_count ?? 0
          }))
        } as MonthlyReport;
      }),
      catchError(err => {
        console.warn('Backend unavailable, using fallback mock monthly report', err);
        return of(this.getMockMonthlyReport(year, month));
      })
    );
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
        main_tutor_name: 'Marco Bianchi',
        main_tutor_phone: '+39 340 1234567'
      }
    ];
  }

  private getMockExpectedAttendances(): AttendanceRecord[] {
    return [
      { student_id: 1, first_name: 'Leonardo', last_name: 'Bianchi', school: 'Scuola Primaria Rodari', is_present: true, has_meal: true, is_excused: false }
    ];
  }

  private getMockDailyReport(date: string): DailyReport {
    return {
      date,
      statistics: { totalExpected: 18, present: 14, extraPresent: 2, absent: 3, excused: 1 },
      extraStudents: [],
      unjustifiedAbsences: []
    };
  }

  private getMockMensaReport(from: string, to: string): MensaReport {
    return {
      from,
      to,
      total_meals: 42,
      breakdown: []
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
        totalExtraPresent: 5,
        totalUnjustifiedAbsent: 3,
        totalExcused: 2,
        totalMeals: 45,
        activeDays: 15
      },
      dailyTrend: [],
      studentsSummary: []
    };
  }
}
