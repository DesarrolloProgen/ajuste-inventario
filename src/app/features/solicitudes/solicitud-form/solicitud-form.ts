import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs/operators';
import { Bodega, DetalleSolicitud, Producto, SolicitudFormValue, Usuario } from '../../../core/models';
import { LoadingService } from '../../../core/services/loading.service';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { ProductoService } from '../../../core/services/producto.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ProductoSelector } from '../../../shared/components/producto-selector/producto-selector';

type ItemForm = FormGroup<{
  id: FormControl<string>;
  codigoReferencia: FormControl<string>;
  descripcion: FormControl<string>;
  bodega: FormControl<string>;
  cantidad: FormControl<number>;
  costoUnitario: FormControl<number>;
}>;

function minItems(min: number): ValidatorFn {
  return (control: AbstractControl) => ((control as FormArray).length >= min ? null : { minItems: true });
}

function distintoDeCero(control: AbstractControl) {
  return Number(control.value) !== 0 ? null : { distintoDeCero: true };
}

@Component({
  selector: 'app-solicitud-form',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ProductoSelector,
  ],
  templateUrl: './solicitud-form.html',
  styleUrl: './solicitud-form.scss',
})
export class SolicitudForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly solicitudService = inject(SolicitudService);
  private readonly productoService = inject(ProductoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly loading = inject(LoadingService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);

  protected readonly enviando = signal(false);
  protected readonly bodegas = signal<Bodega[]>([]);
  protected readonly aprobadoresGerencia = signal<Usuario[]>([]);
  protected readonly aprobadoresAlmacen = signal<Usuario[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    solicitante: ['', Validators.required],
    fecha: [this.hoy(), Validators.required],
    lineaComercial: ['', Validators.required],
    observaciones: [''],
    aprobadorGerencia: ['', Validators.required],
    aprobadorAlmacen: ['', Validators.required],
    items: this.fb.array<ItemForm>([], minItems(1)),
  });

  protected readonly totalGeneral = toSignal(
    this.form.controls.items.valueChanges.pipe(
      startWith(this.form.controls.items.value),
      map((items) => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0), 0)),
    ),
    { initialValue: 0 },
  );

  constructor() {
    this.productoService.listarBodegas().subscribe((datos) => this.bodegas.set(datos));
    this.usuarioService.listarPorNivel('Gerencia').subscribe((datos) => this.aprobadoresGerencia.set(datos));
    this.usuarioService.listarPorNivel('Almacen').subscribe((datos) => this.aprobadoresAlmacen.set(datos));
    this.agregarItem();
  }

  protected get items(): FormArray<ItemForm> {
    return this.form.controls.items;
  }

  protected agregarItem(): void {
    const grupo: ItemForm = this.fb.nonNullable.group({
      id: [''],
      codigoReferencia: ['', Validators.required],
      descripcion: [''],
      bodega: ['', Validators.required],
      cantidad: [1, [Validators.required, distintoDeCero]],
      costoUnitario: [0, [Validators.required, Validators.min(0)]],
    });
    this.items.push(grupo);
  }

  protected eliminarItem(indice: number): void {
    if (this.items.length <= 1) return;
    this.items.removeAt(indice);
  }

  protected onProductoSeleccionado(indice: number, producto: Producto): void {
    this.items.at(indice).patchValue({ codigoReferencia: producto.codigo, descripcion: producto.descripcion });
  }

  protected costoTotalFila(grupo: AbstractControl): number {
    const cantidad = Number(grupo.get('cantidad')?.value) || 0;
    const costoUnitario = Number(grupo.get('costoUnitario')?.value) || 0;
    return Math.round(cantidad * costoUnitario * 100) / 100;
  }

  protected enviarSolicitud(): void {
    if (!this.validarFormulario()) return;
    this.confirmar({
      titulo: 'Enviar solicitud',
      mensaje: 'Se enviará la solicitud a Gerencia y Almacén para su aprobación. ¿Desea continuar?',
      textoConfirmar: 'Enviar',
    }).subscribe((ok) => {
      if (!ok) return;
      const payload = this.construirPayload();
      this.enviando.set(true);
      this.loading.iniciar();
      this.solicitudService.crear(payload).subscribe({
        next: (solicitud) => {
          this.loading.detener();
          this.enviando.set(false);
          this.notificacion.exito(`Solicitud ${solicitud.numero} enviada a Gerencia y Almacén.`);
          this.router.navigate(['/solicitudes', solicitud.id]);
        },
        error: (err: Error) => {
          this.loading.detener();
          this.enviando.set(false);
          this.notificacion.error(err.message ?? 'No se pudo enviar la solicitud.');
        },
      });
    });
  }

  protected cancelar(): void {
    this.confirmar({
      titulo: 'Cancelar solicitud',
      mensaje: 'Se perderán los datos ingresados. ¿Desea salir?',
      textoConfirmar: 'Salir',
      peligroso: true,
    }).subscribe((ok) => {
      if (ok) this.router.navigate(['/solicitudes']);
    });
  }

  private validarFormulario(): boolean {
    if (this.items.length === 0) {
      this.notificacion.error('Agregue al menos un ítem antes de enviar.');
      return false;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificacion.error('Revise los campos obligatorios del formulario.');
      return false;
    }
    return true;
  }

  private confirmar(data: ConfirmDialogData) {
    return this.dialog.open(ConfirmDialog, { data, width: '420px' }).afterClosed();
  }

  private construirPayload(): SolicitudFormValue {
    const valor = this.form.getRawValue();
    const items: DetalleSolicitud[] = valor.items.map((it) => ({
      id: it.id,
      codigoReferencia: it.codigoReferencia,
      descripcion: it.descripcion,
      bodega: it.bodega,
      cantidad: it.cantidad,
      costoUnitario: it.costoUnitario,
      costoTotal: Math.round(it.cantidad * it.costoUnitario * 100) / 100,
    }));
    return {
      solicitante: valor.solicitante,
      fecha: valor.fecha,
      lineaComercial: valor.lineaComercial,
      observaciones: valor.observaciones,
      aprobadorGerencia: valor.aprobadorGerencia,
      aprobadorAlmacen: valor.aprobadorAlmacen,
      items,
    };
  }

  private hoy(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
