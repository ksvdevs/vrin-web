import { Component, computed, forwardRef, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable } from 'rxjs';

import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

export interface OpcionAltaInline {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-select-con-alta-inline',
  imports: [Button, Dialog, FormsModule, InputText, Select],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectConAltaInline),
      multi: true,
    },
  ],
  templateUrl: './select-con-alta-inline.html',
  styleUrl: './select-con-alta-inline.scss',
})
export class SelectConAltaInline implements ControlValueAccessor {
  private readonly mensajes = inject(MessageService);

  readonly opciones = input.required<OpcionAltaInline[]>();
  readonly placeholder = input('Selecciona una opción');
  readonly etiquetaAlta = input('Agregar nuevo');
  readonly tituloDialogo = input('Nuevo registro');
  readonly puedeCrear = input(true);
  readonly crear = input.required<(nombre: string) => Observable<OpcionAltaInline>>();

  readonly creado = output<OpcionAltaInline>();

  protected readonly agregados = signal<OpcionAltaInline[]>([]);
  protected readonly opcionesVisibles = computed(() => {
    const conocidas = new Set(this.agregados().map((o) => o.id));
    return [...this.opciones().filter((o) => !conocidas.has(o.id)), ...this.agregados()];
  });

  protected readonly valor = signal<number | null>(null);
  protected readonly deshabilitado = signal(false);

  protected readonly dialogoVisible = signal(false);
  protected readonly nuevoNombre = signal('');
  protected readonly creando = signal(false);

  private onChange: (valor: number | null) => void = () => {};

  protected onTouched: () => void = () => {};

  writeValue(valor: number | null): void {
    this.valor.set(valor ?? null);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  protected alCambiar(valor: number | null): void {
    this.valor.set(valor);
    this.onChange(valor);
  }

  protected abrirAlta(): void {
    this.nuevoNombre.set('');
    this.dialogoVisible.set(true);
  }

  protected confirmarAlta(): void {
    const nombre = this.nuevoNombre().trim();
    if (!nombre || this.creando()) {
      return;
    }
    this.creando.set(true);
    this.crear()(nombre).subscribe({
      next: (opcion) => {
        this.creando.set(false);
        this.dialogoVisible.set(false);
        this.agregados.update((lista) => [...lista, opcion]);
        this.alCambiar(opcion.id);
        this.creado.emit(opcion);
        this.mensajes.add({
          severity: 'success',
          summary: 'Registro creado',
          detail: `Se agregó "${opcion.nombre}".`,
        });
      },
      error: () => {
        this.creando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo crear',
          detail: 'Ocurrió un error al registrar. Intenta nuevamente.',
        });
      },
    });
  }
}
