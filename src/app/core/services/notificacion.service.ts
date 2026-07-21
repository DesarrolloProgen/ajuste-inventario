import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);

  exito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3500, panelClass: 'snackbar-exito' });
  }

  error(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 5000, panelClass: 'snackbar-error' });
  }
}
