import { Injectable, computed, signal } from '@angular/core';

/** Contador de operaciones asíncronas en curso, usado para el spinner global. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly contador = signal(0);
  readonly cargando = computed(() => this.contador() > 0);

  iniciar(): void {
    this.contador.update((n) => n + 1);
  }

  detener(): void {
    this.contador.update((n) => Math.max(0, n - 1));
  }
}
