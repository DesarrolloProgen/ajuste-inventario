import { Injectable, signal } from '@angular/core';
import productosSeed from '../mock-data/productos.json';
import bodegasSeed from '../mock-data/bodegas.json';
import usuariosSeed from '../mock-data/usuarios.json';
import estadosSeed from '../mock-data/estados.json';
import { Bodega, Producto, Usuario } from '../models';

export interface EstadoMeta {
  valor: string;
  etiqueta: string;
  claseCss: string;
  orden: number;
}

/**
 * Catálogos locales (bodegas/productos/usuarios/estados-metadata), de solo lectura y
 * embebidos en el bundle (derivados de InformacionAjusteInventario.md). El JSON es la
 * única fuente de verdad: cada deploy nuevo los actualiza para todos. Las solicitudes
 * (ajustes de inventario) ya NO viven aquí: se leen/escriben contra la API real de
 * Power Automate (ver AjusteInventarioApiService).
 */
@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  readonly productos = signal<Producto[]>(productosSeed as Producto[]);
  readonly bodegas = signal<Bodega[]>(bodegasSeed as Bodega[]);
  readonly usuarios = signal<Usuario[]>(usuariosSeed as Usuario[]);
  readonly estados = signal<EstadoMeta[]>(estadosSeed as EstadoMeta[]);
}
