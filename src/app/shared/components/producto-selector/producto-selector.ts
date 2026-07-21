import { toSignal } from '@angular/core/rxjs-interop';
import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { Producto } from '../../../core/models';
import { ProductoService } from '../../../core/services/producto.service';

@Component({
  selector: 'app-producto-selector',
  standalone: true,
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './producto-selector.html',
})
export class ProductoSelector {
  private readonly productoService = inject(ProductoService);

  /** Código de producto ya seleccionado (modo edición). */
  readonly valorInicial = input<string>('');
  readonly deshabilitado = input<boolean>(false);
  readonly seleccionado = output<Producto>();

  protected readonly control = new FormControl<string | Producto>('', { nonNullable: true });

  protected readonly opciones = toSignal(
    this.control.valueChanges.pipe(
      map((valor) => (typeof valor === 'string' ? valor : valor.codigo)),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((termino) => this.productoService.buscar(termino)),
    ),
    { initialValue: [] as Producto[] },
  );

  constructor() {
    effect(() => {
      const codigo = this.valorInicial();
      if (codigo) {
        this.productoService.obtenerPorCodigo(codigo).subscribe((producto) => {
          if (producto) this.control.setValue(producto, { emitEvent: false });
        });
      }
    });
    effect(() => {
      if (this.deshabilitado()) this.control.disable({ emitEvent: false });
      else this.control.enable({ emitEvent: false });
    });
  }

  protected readonly displayFn = (valor: string | Producto): string => {
    if (!valor) return '';
    return typeof valor === 'string' ? valor : `${valor.codigo} — ${valor.descripcion}`;
  };

  protected onSeleccion(evento: MatAutocompleteSelectedEvent): void {
    const producto = evento.option.value as Producto;
    this.control.setValue(producto, { emitEvent: false });
    this.seleccionado.emit(producto);
  }
}
