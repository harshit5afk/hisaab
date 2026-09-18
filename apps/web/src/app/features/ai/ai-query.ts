import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiApiService } from '../../core/api/ai-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';

interface QueryHistoryItem {
  question: string;
  answer: string;
  timestamp: string;
}

@Component({
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>AI Query Assistant</h1>
        <p class="subtitle">Ask about your business sales, customer balances, or calculations in English or Hindi</p>
      </div>
    </div>

    <div class="ai-layout">
      <!-- Left Column: Main Query & Response Area -->
      <div class="main-column">
        <div class="card query-card">
          <div class="card-header-bar">
            <div class="header-left">
              <mat-icon class="header-icon">smart_toy</mat-icon>
              <h3>Ask about your business</h3>
            </div>
          </div>
          <p class="hint">Ask in plain English or Hinglish (e.g. "Total sales", "Pending balance", customer hisaab, or "2+2")</p>

          <div class="input-row">
            <mat-form-field appearance="outline" class="query-input">
              <mat-label>Type your question...</mat-label>
              <input
                matInput
                [(ngModel)]="question"
                (keydown.enter)="ask()"
                placeholder="e.g. Total sales, pending balance, 2+2"
              />
              <mat-icon matPrefix class="input-icon">chat</mat-icon>
            </mat-form-field>

            @if (loading()) {
              <button mat-flat-button color="primary" class="ask-btn" disabled>
                <mat-spinner diameter="20" />
              </button>
            } @else {
              <button
                mat-flat-button
                color="primary"
                class="ask-btn"
                (click)="ask()"
                [disabled]="!question.trim()"
              >
                <mat-icon>send</mat-icon> Ask
              </button>
            }
          </div>

          <!-- Quick Suggestion Chips with Real Customers from Database -->
          <div class="quick-chips">
            <span class="chip-label">Quick questions:</span>
            <button type="button" class="chip" (click)="setQuestion('Total sales kitni hui hai?')">
              📊 Total Sales
            </button>
            <button type="button" class="chip" (click)="setQuestion('Pending balance kiska baaki hai?')">
              ⏳ Pending Balances
            </button>
            @for (cust of realCustomers(); track cust.id) {
              <button type="button" class="chip" (click)="setQuestion(cust.name + ' ka balance kitna hai?')">
                👤 {{ cust.name }}
              </button>
            }
            <button type="button" class="chip" (click)="setQuestion('2+2')">
              🧮 2+2
            </button>
          </div>
        </div>

        @if (loading()) {
          <div class="card loading-card">
            <mat-spinner diameter="36" />
            <div class="loading-text">
              <p class="loading-title">AI Assistant is thinking...</p>
              <p class="loading-sub">Analyzing your real-time customer and sales records</p>
            </div>
          </div>
        } @else if (answer()) {
          <div class="card answer-card">
            <div class="answer-header">
              <div class="header-left">
                <span class="ai-badge">
                  <mat-icon>auto_awesome</mat-icon> AI Response
                </span>
              </div>
              <button mat-icon-button (click)="copyAnswer()" [matTooltip]="copied() ? 'Copied!' : 'Copy response'">
                <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
            <div class="answer-body">{{ answer() }}</div>
          </div>
        }
      </div>

      <!-- Right Column: Recent Queries History Sidebar -->
      <aside class="history-column">
        <div class="card history-card">
          <div class="history-header">
            <div class="history-title">
              <mat-icon>history</mat-icon>
              <h3>Recent Queries</h3>
            </div>
            @if (history().length > 0) {
              <button mat-icon-button class="clear-btn" (click)="clearHistory()" matTooltip="Clear history">
                <mat-icon>delete_outline</mat-icon>
              </button>
            }
          </div>

          @if (history().length === 0) {
            <div class="empty-history">
              <div class="empty-icon-wrap">
                <mat-icon>chat_bubble_outline</mat-icon>
              </div>
              <h4>No recent queries</h4>
              <p>Your questions and AI responses will appear here on the right panel.</p>
            </div>
          } @else {
            <div class="history-list">
              @for (item of history(); track $index) {
                <div class="history-item" (click)="loadHistory(item)" matTooltip="Click to load this answer">
                  <div class="history-q">
                    <mat-icon>help_outline</mat-icon>
                    <span class="q-text">{{ item.question }}</span>
                  </div>
                  <div class="history-a">{{ item.answer }}</div>
                </div>
              }
            </div>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
      .subtitle {
        color: var(--text-muted);
        margin-top: 4px;
        font-size: 0.95rem;
      }
    }

    .ai-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 960px) {
      .ai-layout {
        grid-template-columns: 1fr;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }

    .query-card {
      padding: 24px;
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      background: var(--bg-card);
      border-radius: var(--radius-md, 12px);

      .card-header-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
          }
          .header-icon {
            color: var(--accent-indigo, #6366f1);
          }
        }
      }

      .hint {
        color: var(--text-muted);
        font-size: 0.875rem;
        margin-bottom: 18px;
      }

      .input-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;

        .query-input {
          flex: 1;
        }

        .ask-btn {
          height: 54px;
          padding: 0 24px;
          font-weight: 600;
          border-radius: var(--radius-sm, 8px);
        }
      }

      .quick-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 8px;

        .chip-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-right: 4px;
        }

        .chip {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: var(--text-primary);
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 0.825rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;

          &:hover {
            background: rgba(99, 102, 241, 0.22);
            border-color: rgba(99, 102, 241, 0.5);
            transform: translateY(-1px);
          }
        }
      }
    }

    .loading-card {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 24px;
      border-radius: var(--radius-md, 12px);
      background: var(--bg-card);
      border: 1px dashed var(--accent-indigo, #6366f1);

      .loading-text {
        .loading-title {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 4px;
        }
        .loading-sub {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0;
        }
      }
    }

    .answer-card {
      padding: 22px;
      border-radius: var(--radius-md, 12px);
      border: 1px solid rgba(99, 102, 241, 0.3);
      background: var(--bg-card);
      box-shadow: 0 4px 24px rgba(99, 102, 241, 0.08);

      .answer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--accent-indigo, #6366f1);
          font-weight: 600;
          font-size: 0.875rem;

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .answer-body {
        font-size: 1.05rem;
        line-height: 1.75;
        padding: 18px;
        background: var(--bg-elevated);
        border-radius: var(--radius-sm, 8px);
        white-space: pre-wrap;
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
    }

    /* Right Column: History Sidebar */
    .history-column {
      min-width: 0;
    }

    .history-card {
      padding: 20px;
      border-radius: var(--radius-md, 12px);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      max-height: calc(100vh - 160px);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 24px;

      .history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-color);

        .history-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-indigo, #6366f1);

          h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
          }
        }

        .clear-btn {
          color: var(--text-muted);
          &:hover {
            color: var(--warn, #ef4444);
          }
        }
      }

      .empty-history {
        text-align: center;
        padding: 36px 16px;
        color: var(--text-muted);

        .empty-icon-wrap {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: var(--text-muted);
          }
        }

        h4 {
          margin: 0 0 6px;
          font-size: 1rem;
          color: var(--text-secondary);
        }

        p {
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }
      }

      .history-list {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-right: 4px;

        .history-item {
          padding: 12px;
          border-radius: var(--radius-sm, 8px);
          background: var(--bg-elevated);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--accent-indigo, #6366f1);
            background: rgba(99, 102, 241, 0.08);
            transform: translateX(2px);
          }

          .history-q {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-primary);
            margin-bottom: 6px;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              color: var(--accent-indigo, #6366f1);
              flex-shrink: 0;
            }

            .q-text {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }

          .history-a {
            color: var(--text-muted);
            font-size: 0.825rem;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }
      }
    }
  `],
})
export default class AiQuery implements OnInit {
  question = '';
  answer = signal('');
  loading = signal(false);
  copied = signal(false);
  history = signal<QueryHistoryItem[]>([]);
  realCustomers = signal<Array<{ id: string; name: string }>>([]);

  constructor(
    private aiApi: AiApiService,
    private customersApi: CustomersApiService,
  ) {
    try {
      const saved = localStorage.getItem('hisaab_ai_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = parsed.map((item: QueryHistoryItem) => ({
          ...item,
          answer: this.cleanLegacyRs(item.answer, item.question),
        }));
        this.history.set(sanitized);
      }
    } catch {}
  }

  ngOnInit() {
    this.customersApi.findAll({ limit: 4 }).subscribe({
      next: (res) => {
        const list = (res?.data || res || []).filter(
          (c: any) => c.name && c.name.toLowerCase() !== 'xxxx',
        );
        this.realCustomers.set(list.slice(0, 3));
      },
      error: () => {},
    });
  }

  setQuestion(prompt: string) {
    this.question = prompt;
    this.ask();
  }

  loadHistory(item: QueryHistoryItem) {
    this.question = item.question;
    this.answer.set(item.answer);
  }

  clearHistory() {
    this.history.set([]);
    try {
      localStorage.removeItem('hisaab_ai_history');
    } catch {}
  }

  copyAnswer() {
    if (!this.answer()) return;
    navigator.clipboard.writeText(this.answer()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  ask() {
    if (!this.question.trim() || this.loading()) return;
    this.loading.set(true);
    this.answer.set('');
    const q = this.question.trim();

    this.aiApi.query(q).subscribe({
      next: (res) => {
        const cleanAnswer = this.cleanLegacyRs(res.answer, q);
        this.answer.set(cleanAnswer);

        const newItem: QueryHistoryItem = {
          question: q,
          answer: cleanAnswer,
          timestamp: new Date().toISOString(),
        };

        this.history.update((h) => {
          const updated = [newItem, ...h.filter((x) => x.question !== q)].slice(0, 20);
          try {
            localStorage.setItem('hisaab_ai_history', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        this.loading.set(false);
        this.question = '';
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Sorry, I could not process that query. Please try again.';
        this.answer.set(errorMsg);
        this.loading.set(false);
      },
    });
  }

  private cleanLegacyRs(text: string, originalQuestion: string): string {
    let res = text.replace(/\bRs\.?\s*/gi, '₹').replace(/Rs\?/gi, '₹');
    if (/^[0-9\s+\-*/().%^]+$/.test(originalQuestion.trim())) {
      res = res.replace(/^₹\s*/, '');
    }
    return res;
  }
}