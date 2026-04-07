import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStatus } from '../core/models';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="pill" [class]="status()">{{ status() }}</span>`,
  styles: [
    `
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        text-transform: capitalize;
        font-size: 0.78rem;
        border: 1px solid transparent;
      }
      .success { background: rgba(34, 197, 94, 0.12); color: #86efac; border-color: rgba(34, 197, 94, 0.35); }
      .failed { background: rgba(248, 113, 113, 0.12); color: #fda4af; border-color: rgba(248, 113, 113, 0.35); }
      .in-progress { background: rgba(56, 189, 248, 0.12); color: #7dd3fc; border-color: rgba(56, 189, 248, 0.35); }
      .info { background: rgba(250, 204, 21, 0.14); color: #fde68a; border-color: rgba(250, 204, 21, 0.35); }
    `
  ]
})
export class StatusPillComponent {
  readonly status = input<TaskStatus>('info');
}
