import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Bodega, Producto } from '../models';
import { MockDatabaseService } from './mock-database.service';

const LATENCIA_MS = 200;
const LIMITE_RESULTADOS = 50;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Simula el acceso al catálogo de productos y bodegas (futura ProductosInventario/BodegasInventario en SharePoint). */
@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly db = inject(MockDatabaseService);

  buscar(termino: string): Observable<Producto[]> {
    const texto = normalizar(termino ?? '').trim();
    const resultado = texto
      ? this.db
          .productos()
          .filter((p) => normalizar(p.codigo).includes(texto) || normalizar(p.descripcion).includes(texto))
          .slice(0, LIMITE_RESULTADOS)
      : this.db.productos().slice(0, LIMITE_RESULTADOS);
    return of(resultado).pipe(delay(LATENCIA_MS));
  }

  obtenerPorCodigo(codigo: string): Observable<Producto | undefined> {
    return of(this.db.productos().find((p) => p.codigo === codigo)).pipe(delay(LATENCIA_MS));
  }

  listarBodegas(): Observable<Bodega[]> {
    return of(this.db.bodegas().filter((b) => b.activo)).pipe(delay(LATENCIA_MS));
  }

  totalProductos(): Observable<number> {
    return of(this.db.productos().length).pipe(map((n) => n));
  }
}
