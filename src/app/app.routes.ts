import { Routes } from '@angular/router';

import { devAuthGuard, invitadoGuard } from './core/guards/dev-auth.guard';
import { DevLogin } from './features/dev-login/dev-login';
import { Docentes } from './features/catalogos/docentes/docentes';
import { Inicio } from './features/inicio/inicio';
import { RegistroExpediente } from './features/expedientes/registro/registro-expediente';
import { ListaExpedientes } from './features/expedientes/lista/lista';
import { VistaExpediente } from './features/expedientes/expediente/expediente';
import { Plantillas } from './features/plantillas/plantillas';

export const routes: Routes = [
  { path: 'login', component: DevLogin, canActivate: [invitadoGuard] },
  { path: '', component: Inicio, canActivate: [devAuthGuard] },
  { path: 'catalogos/docentes', component: Docentes, canActivate: [devAuthGuard] },
  { path: 'plantillas', component: Plantillas, canActivate: [devAuthGuard] },
  { path: 'expedientes', component: ListaExpedientes, canActivate: [devAuthGuard] },
  { path: 'expedientes/nuevo', component: RegistroExpediente, canActivate: [devAuthGuard] },
  { path: 'expedientes/:id', component: VistaExpediente, canActivate: [devAuthGuard] },
  { path: '**', redirectTo: '' },
];
