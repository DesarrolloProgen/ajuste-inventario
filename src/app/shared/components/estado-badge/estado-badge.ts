import { Component, computed, inject, input } from '@angular/core';
import { MockDatabaseService } from '../../../core/services/mock-database.service';

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  templateUrl: './estado-badge.html',
  styleUrl: './estado-badge.scss',
})
export class EstadoBadge {
  private readonly db = inject(MockDatabaseService);
  readonly estado = input.required<string>();

  private readonly meta = computed(() => this.db.estados().find((e) => e.valor === this.estado()));
  protected readonly etiqueta = computed(() => this.meta()?.etiqueta ?? this.estado());
  protected readonly clase = computed(() => this.meta()?.claseCss ?? '');
}
