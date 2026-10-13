import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';

import { LayoutComponent } from './shared/layout/layout';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login').then(m => m.Login), canActivate: [guestGuard] },
  { 
    path: '', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio) },
      { path: 'catalogos/docentes', loadComponent: () => import('./features/catalogos/docentes/docentes').then(m => m.Docentes) },
      {
        path: 'expedientes',
        loadComponent: () => import('./features/expedientes/lista/lista').then(m => m.ListaExpedientes),
        children: [
          { path: 'nuevo', loadComponent: () => import('./features/expedientes/registro/registro-expediente').then(m => m.RegistroExpediente) },
          { path: ':id/editar', loadComponent: () => import('./features/expedientes/registro/registro-expediente').then(m => m.RegistroExpediente) },
        ],
      },
      { path: 'expedientes/:id', loadComponent: () => import('./features/expedientes/expediente/expediente').then(m => m.VistaExpediente) },
      { path: 'plantillas', loadComponent: () => import('./features/plantillas/plantillas').then(m => m.Plantillas) },
      { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'roles', loadComponent: () => import('./features/roles/roles').then(m => m.Roles) },
    ]
  },
  { path: '**', redirectTo: '' },
];
