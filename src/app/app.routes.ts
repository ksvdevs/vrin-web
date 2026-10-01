import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import { DevLogin } from './features/dev-login/dev-login';
import { Docentes } from './features/catalogos/docentes/docentes';
import { Inicio } from './features/inicio/inicio';
import { RegistroExpediente } from './features/expedientes/registro/registro-expediente';
import { ListaExpedientes } from './features/expedientes/lista/lista';
import { VistaExpediente } from './features/expedientes/expediente/expediente';
import { Plantillas } from './features/plantillas/plantillas';

import { LayoutComponent } from './shared/layout/layout';

export const routes: Routes = [
  { path: 'login', component: DevLogin, canActivate: [guestGuard] },
  { 
    path: '', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', component: Inicio },
      { path: 'catalogos/docentes', component: Docentes },
      { path: 'expedientes', component: ListaExpedientes },
      { path: 'expedientes/nuevo', component: RegistroExpediente },
      { path: 'expedientes/:id/editar', component: RegistroExpediente },
      { path: 'expedientes/:id', component: VistaExpediente },
      { path: 'plantillas', component: Plantillas },
      { path: 'usuarios', loadComponent: () => import('./features/usuarios/usuarios').then(m => m.Usuarios) },
    ]
  },
  { path: '**', redirectTo: '' },
];
