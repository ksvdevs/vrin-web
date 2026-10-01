import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dev-login',
  standalone: true,
  imports: [CardModule, ButtonModule, DialogModule, InputTextModule, TextareaModule, FormsModule],
  templateUrl: './dev-login.html',
  styleUrl: './dev-login.scss',
})
export class DevLogin {
  solicitarAccesoVisible = false;
  enviando = false;

  solicitud = {
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    dependencia: '',
    cargo: '',
    motivo: ''
  };

  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  loginConGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google/redirect`;
  }

  enviarSolicitud() {
    this.enviando = true;
    this.http.post(`${environment.apiUrl}/solicitudes-acceso`, this.solicitud).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enviada',
          detail: 'Su solicitud ha sido registrada y está pendiente de aprobación.'
        });
        this.solicitarAccesoVisible = false;
        this.enviando = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Verifique los datos e intente nuevamente.'
        });
        this.enviando = false;
      }
    });
  }
}
