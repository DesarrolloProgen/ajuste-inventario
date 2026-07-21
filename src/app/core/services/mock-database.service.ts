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

const STORAGE_PREFIX = 'ajuste-inventario.';

/**
 * Catálogos locales (bodegas/productos/usuarios/estados-metadata). En el primer arranque
 * copia las semillas (derivadas de InformacionAjusteInventario.md) a localStorage; de ahí
 * en adelante todas las lecturas/escrituras pasan por aquí. Las solicitudes (ajustes de
 * inventario) ya NO viven aquí: se leen/escriben contra la API real de Power Automate
 * (ver AjusteInventarioApiService).
 */
@Injectable({ providedIn: 'root' })
export class MockDatabaseService {
  readonly productos = signal<Producto[]>(this.loadOrSeed('productos', productosSeed as Producto[]));
  readonly bodegas = signal<Bodega[]>(this.loadOrSeed('bodegas', bodegasSeed as Bodega[]));
  readonly usuarios = signal<Usuario[]>(this.loadOrSeed('usuarios', usuariosSeed as Usuario[]));
  readonly estados = signal<EstadoMeta[]>(this.loadOrSeed('estados', estadosSeed as EstadoMeta[]));

  /** Restaura los datos semilla originales, descartando lo guardado en localStorage. */
  reiniciarDatos(): void {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    this.productos.set(productosSeed as Producto[]);
    this.bodegas.set(bodegasSeed as Bodega[]);
    this.usuarios.set(usuariosSeed as Usuario[]);
    this.estados.set(estadosSeed as EstadoMeta[]);
    this.persist('productos', this.productos());
    this.persist('bodegas', this.bodegas());
    this.persist('usuarios', this.usuarios());
    this.persist('estados', this.estados());
  }

  private loadOrSeed<T>(key: string, seed: T): T {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        // localStorage corrupto: cae a la semilla
      }
    }
    this.persist(key, seed);
    return seed;
  }

  private persist<T>(key: string, value: T): void {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  }
}
