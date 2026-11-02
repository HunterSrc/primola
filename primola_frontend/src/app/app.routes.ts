import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { AttendanceDashboardComponent } from './features/attendance/attendance-dashboard.component';
import { AnagraficaComponent } from './features/anagrafica/anagrafica.component';
import { StudentEditComponent } from './features/anagrafica/student-edit.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { AfterschoolCalendarComponent } from './features/afterschool/afterschool-calendar.component';
import { UsersListComponent } from './features/users/users-list.component';
import { UserFormComponent } from './features/users/user-form.component';
import { ProjectsListComponent } from './features/projects/projects-list.component';
import { ProjectDetailComponent } from './features/projects/project-detail.component';
import { AfterschoolListComponent } from './features/afterschool/afterschool-list.component';
import { AfterschoolExpensesComponent } from './features/afterschool/afterschool-expenses.component';
import { ReportsComponent } from './features/reports/reports.component';
import { AfterschoolPackagesPageComponent } from './features/admin/afterschool-packages-page.component';
import { PaymentsDashboardComponent } from './features/payments/payments-dashboard.component';
import { authGuard, adminGuard, guestGuard, adminOrOfficeGuard, reportsGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: AttendanceDashboardComponent
      },
      {
        path: 'afterschool-calendar',
        component: AfterschoolCalendarComponent
      },
      {
        path: 'payments',
        component: PaymentsDashboardComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'anagrafica',
        component: AnagraficaComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'anagrafica/:id/edit',
        component: StudentEditComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'users',
        component: UsersListComponent
      },
      {
        path: 'users/new',
        component: UserFormComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'users/:id',
        component: UserFormComponent
      },
      {
        path: 'projects',
        component: ProjectsListComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'projects/new',
        component: ProjectDetailComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'projects/:id',
        component: ProjectDetailComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'afterschool',
        component: AfterschoolListComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'afterschool-expenses',
        component: AfterschoolExpensesComponent,
        canActivate: [adminOrOfficeGuard]
      },
      {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [reportsGuard]
      },
      {
        path: 'admin/afterschool-packages',
        component: AfterschoolPackagesPageComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'admin/dashboard',
        component: AdminDashboardComponent,
        canActivate: [adminGuard]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
