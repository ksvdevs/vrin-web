import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, Toast],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly mensajes = inject(MessageService);
  private readonly ruta = inject(ActivatedRoute);

  protected email = '';
  protected clave = '';
  protected verClave = signal(false);
  protected cargando = signal(false);
  protected temaOscuro = signal(false);

  ngOnInit(): void {
    const error = this.ruta.snapshot.queryParamMap.get('error');
    if (error) {
      this.mensajes.add({
        severity: 'error',
        summary: 'No se pudo iniciar sesión con Google',
        detail: error === 'dominio_invalido'
          ? 'Usa una cuenta institucional @unamba.edu.pe verificada.'
          : error === 'acceso_denegado'
            ? 'El correo no está registrado o la cuenta no está activa.'
            : 'Intenta nuevamente o ingresa con tu contraseña.',
      });
    }
  }

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
    const origen = window.location.hostname === 'localhost'
      ? `${window.location.protocol}//127.0.0.1:${window.location.port}`
      : window.location.origin;
    window.location.assign(`${origen}${environment.apiUrl}/auth/google/redirect`);
  }
}
