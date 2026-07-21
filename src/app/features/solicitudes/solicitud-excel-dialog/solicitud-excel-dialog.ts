import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { map, startWith } from 'rxjs/operators';
import { Solicitud } from '../../../core/models';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { SolicitudExcelService } from '../../../core/services/solicitud-excel.service';

export interface SolicitudExcelDialogData {
  solicitud: Solicitud;
}

@Component({
  selector: 'app-solicitud-excel-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
  ],
  templateUrl: './solicitud-excel-dialog.html',
  styleUrl: './solicitud-excel-dialog.scss',
})
export class SolicitudExcelDialog {
  protected readonly data = inject<SolicitudExcelDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<SolicitudExcelDialog>);
  private readonly fb = inject(FormBuilder);
  private readonly excelService = inject(SolicitudExcelService);
  private readonly notificacion = inject(NotificacionService);

  protected readonly columnasPreview = ['columna', 'a', 'b', 'c', 'd', 'h'];

  protected readonly form = this.fb.nonNullable.group({
    tipoMovimiento: ['', Validators.required],
    fecha: [this.data.solicitud.fecha, Validators.required],
    centroCosto: ['', Validators.required],
    observaciones: [''],
  });

  protected readonly filasPreview = toSignal(
    this.form.valueChanges.pipe(
      startWith(this.form.getRawValue()),
      map(() => this.excelService.previsualizar(this.data.solicitud, this.form.getRawValue())),
    ),
    { initialValue: this.excelService.previsualizar(this.data.solicitud, this.form.getRawValue()) },
  );

  protected cancelar(): void {
    this.ref.close();
  }

  protected generar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificacion.error('Complete los campos obligatorios antes de generar el Excel.');
      return;
    }
    this.excelService.generar(this.data.solicitud, this.form.getRawValue());
    this.notificacion.exito(`Excel de la solicitud ${this.data.solicitud.numero} generado.`);
    this.ref.close(true);
  }
}
