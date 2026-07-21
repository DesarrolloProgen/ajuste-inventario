import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'solicitudes',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-list/solicitud-list').then((m) => m.SolicitudList),
      },
      {
        path: 'solicitudes/nueva',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-form/solicitud-form').then((m) => m.SolicitudForm),
      },
      {
        path: 'solicitudes/:id',
        loadComponent: () =>
          import('./features/solicitudes/solicitud-detail/solicitud-detail').then((m) => m.SolicitudDetail),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
