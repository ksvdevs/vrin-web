import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, Toast],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly mensajes = inject(MessageService);

  protected email = '';
  protected clave = '';
  protected verClave = signal(false);
  protected cargando = signal(false);
  protected temaOscuro = signal(false);

  protected ingresar(): void {
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.auth.login(this.email.trim(), this.clave).subscribe({
      next: () => this.cargando.set(false),
      error: (error) => {
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo iniciar sesión',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'Verifica tus credenciales e intenta nuevamente.',
        });
      },
    });
  }

  protected alternarTema(): void {
    this.temaOscuro.update((valor) => !valor);
  }

  protected olvidoClave(): void {
    this.mensajes.add({
      severity: 'info',
      summary: 'Recuperar contraseña',
      detail: 'Contacta al administrador del VRIN para restablecer tu contraseña.',
    });
  }

  protected ingresarConGoogle(): void {
    this.mensajes.add({
      severity: 'info',
      summary: 'Google',
      detail: 'Autenticación con Google disponible próximamente.',
    });
  }
}
