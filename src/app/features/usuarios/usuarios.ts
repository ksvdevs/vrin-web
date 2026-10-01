import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TagModule, InputSwitchModule, FormsModule],
  templateUrl: './usuarios.html'
})
export class Usuarios implements OnInit {
  usuarios: any[] = [];
  modalVisible = false;
  guardando = false;
  roles = [
    { label: 'Administrador', value: 'ADMINISTRADOR' },
    { label: 'Secretaria', value: 'SECRETARIA' },
    { label: 'Calidad', value: 'CALIDAD' }
  ];

  nuevoUsuario = {
    nombre: '',
    email: '',
    rol: ''
  };

  private http = inject(HttpClient);
  private messageService = inject(MessageService);

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.http.get<any[]>(`${environment.apiUrl}/usuarios`).subscribe(data => {
      this.usuarios = data;
    });
  }

  abrirModal() {
    this.nuevoUsuario = { nombre: '', email: '', rol: '' };
    this.modalVisible = true;
  }

  guardarUsuario() {
    this.guardando = true;
    this.http.post(`${environment.apiUrl}/usuarios`, this.nuevoUsuario).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Usuario creado' });
        this.cargarUsuarios();
        this.modalVisible = false;
        this.guardando = false;
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error al guardar' });
        this.guardando = false;
      }
    });
  }

  toggleActivo(usuario: any) {
    this.http.put(`${environment.apiUrl}/usuarios/${usuario.id}`, { activo: usuario.activo }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Estado actualizado' });
      },
      error: () => {
        usuario.activo = !usuario.activo; // Revert
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al actualizar' });
      }
    });
  }

  getSeverity(rol: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const s: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      ADMINISTRADOR: 'danger',
      SECRETARIA: 'info',
      CALIDAD: 'warn'
    };
    return s[rol] || 'info';
  }
}
