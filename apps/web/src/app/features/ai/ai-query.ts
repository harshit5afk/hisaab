import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AiApiService } from '../../core/api/ai-api.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-header"><h1>AI Query</h1></div>

    <div class="query-container">
      <div class="card query-box">
        <h3>Ask about your business</h3>
        <p class="hint">Try: "Ramesh ka kitna balance baaki hai?" or "Total sales this month?"</p>

        <div class="input-row">
          <mat-form-field appearance="outline" class="query-input">
            <mat-label>Type your question...</mat-label>
            <input matInput [(ngModel)]="question" (keydown.enter)="ask()" />
            <mat-icon matPrefix>smart_toy</mat-icon>
          </mat-form-field>
          @if (loading()) {
            <button mat-flat-button color="primary" disabled>
              <mat-spinner diameter="20" />
            </button>
          } @else {
            <button mat-flat-button color="primary" (click)="ask()" [disabled]="!question.trim()">
              <mat-icon>send</mat-icon> Ask
            </button>
          }
        </div>
      </div>

      @if (answer()) {
        <div class="card answer-card">
          <div class="answer-header">
            <mat-icon>smart_toy</mat-icon>
            <span>AI Response</span>
          </div>
          <div class="answer-body">{{ answer() }}</div>
        </div>
      }

      @if (history().length) {
        <div class="card history-card">
          <h3>Recent Queries</h3>
          @for (item of history(); track $index) {
            <div class="history-item">
              <div class="history-q"><mat-icon>help_outline</mat-icon> {{ item.question }}</div>
              <div class="history-a">{{ item.answer }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .query-container { max-width: 800px; }
    .hint { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px; }
    .input-row { display: flex; gap: 12px; align-items: flex-start; }
    .query-input { flex: 1; }
    .answer-card { margin-top: 20px; }
    .answer-header { display: flex; align-items: center; gap: 8px; color: var(--accent-indigo); font-weight: 600; margin-bottom: 12px; }
    .answer-body { font-size: 1.05rem; line-height: 1.7; padding: 16px; background: var(--bg-elevated); border-radius: var(--radius-sm); white-space: pre-wrap; }
    .history-card { margin-top: 20px; }
    .history-item { padding: 16px 0; border-bottom: 1px solid var(--border-color); &:last-child { border-bottom: none; } }
    .history-q { display: flex; align-items: center; gap: 6px; font-weight: 500; margin-bottom: 8px; }
    .history-a { color: var(--text-secondary); font-size: 0.9rem; padding-left: 30px; }
  `],
})
export default class AiQuery {
  question = '';
  answer = signal('');
  loading = signal(false);
  history = signal<Array<{ question: string; answer: string }>>([]);

  constructor(private aiApi: AiApiService) {}

  ask() {
    if (!this.question.trim() || this.loading()) return;
    this.loading.set(true);
    this.answer.set('');
    const q = this.question.trim();

    this.aiApi.query(q).subscribe({
      next: (res) => {
        this.answer.set(res.answer);
        this.history.update((h) => [{ question: q, answer: res.answer }, ...h].slice(0, 10));
        this.loading.set(false);
        this.question = '';
      },
      error: () => {
        this.answer.set('Sorry, I could not process that query. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
