import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Usuario } from '../models';
import { MockDatabaseService } from './mock-database.service';

const LATENCIA_MS = 150;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Simula el acceso al catálogo de aprobadores autorizados (futura AprobadoresInventario en SharePoint). */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly db = inject(MockDatabaseService);

  listar(): Observable<Usuario[]> {
    return of(this.db.usuarios()).pipe(delay(LATENCIA_MS));
  }

  listarPorNivel(nivel: 'Gerencia' | 'Almacen'): Observable<Usuario[]> {
    const objetivo = normalizar(nivel);
    return of(this.db.usuarios().filter((u) => normalizar(u.nivel) === objetivo)).pipe(delay(LATENCIA_MS));
  }

  /** Busca el correo de un aprobador por su nombre exacto (tal como quedó guardado en la solicitud). */
  correoPorNombre(nombre: string): Observable<string> {
    const encontrado = this.db.usuarios().find((u) => u.nombre === nombre);
    return of(encontrado?.correo ?? '').pipe(delay(LATENCIA_MS));
  }
}
