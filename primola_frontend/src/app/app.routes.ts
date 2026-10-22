import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { AttendanceDashboardComponent } from './features/attendance/attendance-dashboard.component';
import { AnagraficaComponent } from './features/anagrafica/anagrafica.component';
import { StudentEditComponent } from './features/anagrafica/student-edit.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

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
        path: 'anagrafica',
        component: AnagraficaComponent
      },
      {
        path: 'anagrafica/:id/edit',
        component: StudentEditComponent
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
