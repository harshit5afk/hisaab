import { Component, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { DashboardApiService } from '../../core/api/dashboard-api.service';

@Component({
  selector: 'hisaab-dashboard',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, RouterLink, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <div class="stats-grid">
      <div class="stat-card receivable">
        <div class="stat-icon">
          <mat-icon>account_balance_wallet</mat-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats().totalReceivable | paiseToRupees }}</div>
          <div class="stat-label">Total Receivable</div>
        </div>
      </div>

      <div class="stat-card sales">
        <div class="stat-icon">
          <mat-icon>trending_up</mat-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats().totalSales | paiseToRupees }}</div>
          <div class="stat-label">Total Sales</div>
        </div>
      </div>

      <div class="stat-card purchases">
        <div class="stat-icon">
          <mat-icon>shopping_cart</mat-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats().totalPurchases | paiseToRupees }}</div>
          <div class="stat-label">Total Purchases</div>
        </div>
      </div>

      <div class="stat-card payments">
        <div class="stat-icon">
          <mat-icon>today</mat-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats().paymentsToday | paiseToRupees }}</div>
          <div class="stat-label">Payments Today</div>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="card chart-card">
        <h3>Monthly Overview (Last 6 Months)</h3>
        <div class="bar-chart">
          @for (month of monthlySummary(); track month.month) {
            <div class="bar-group">
              <div class="bars">
                <div
                  class="bar sales-bar"
                  [style.height.%]="getBarHeight(month.sales)"
                  [title]="(month.sales | paiseToRupees) + ' Sales'"
                ></div>
                <div
                  class="bar purchases-bar"
                  [style.height.%]="getBarHeight(month.purchases)"
                  [title]="(month.purchases | paiseToRupees) + ' Purchases'"
                ></div>
                <div
                  class="bar payments-bar"
                  [style.height.%]="getBarHeight(month.payments)"
                  [title]="(month.payments | paiseToRupees) + ' Payments'"
                ></div>
              </div>
              <span class="bar-label">{{ formatMonth(month.month) }}</span>
            </div>
          }
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="dot sales-dot"></span> Sales</span>
          <span class="legend-item"><span class="dot purchases-dot"></span> Purchases</span>
          <span class="legend-item"><span class="dot payments-dot"></span> Payments</span>
        </div>
      </div>

      <div class="card quick-actions">
        <h3>Quick Actions</h3>
        <div class="actions-grid">
          <a mat-stroked-button routerLink="/sales/new" class="action-btn">
            <mat-icon>add_circle</mat-icon>
            New Invoice
          </a>
          <a mat-stroked-button routerLink="/payments/new" class="action-btn">
            <mat-icon>payments</mat-icon>
            Record Payment
          </a>
          <a mat-stroked-button routerLink="/purchases/new" class="action-btn">
            <mat-icon>shopping_cart</mat-icon>
            Add Purchase
          </a>
          <a mat-stroked-button routerLink="/customers/new" class="action-btn">
            <mat-icon>person_add</mat-icon>
            New Customer
          </a>
          <a mat-stroked-button routerLink="/ai/scan" class="action-btn">
            <mat-icon>document_scanner</mat-icon>
            Scan Bill
          </a>
          <a mat-stroked-button routerLink="/receivables" class="action-btn">
            <mat-icon>account_balance</mat-icon>
            View Balances
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 28px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 24px;
      transition: transform var(--transition-normal), box-shadow var(--transition-normal);

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      flex-shrink: 0;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: white;
      }
    }

    .receivable .stat-icon { background: var(--gradient-primary); }
    .sales .stat-icon { background: var(--gradient-success); }
    .purchases .stat-icon { background: var(--gradient-danger); }
    .payments .stat-icon { background: var(--gradient-info); }

    .stat-value {
      font-size: 1.5rem;
    }

    .charts-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .chart-card h3,
    .quick-actions h3 {
      margin-bottom: 20px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      height: 200px;
      padding: 0 8px;
    }

    .bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 180px;
      width: 100%;
    }

    .bar {
      flex: 1;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height var(--transition-normal);
      cursor: pointer;

      &:hover { opacity: 0.8; }
    }

    .sales-bar { background: var(--accent-green); }
    .purchases-bar { background: var(--accent-red); }
    .payments-bar { background: var(--accent-indigo); }

    .bar-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .chart-legend {
      display: flex;
      gap: 20px;
      margin-top: 16px;
      justify-content: center;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .sales-dot { background: var(--accent-green); }
    .purchases-dot { background: var(--accent-red); }
    .payments-dot { background: var(--accent-indigo); }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-start;
      padding: 12px 16px;
      text-decoration: none;
    }
  `],
})
export default class Dashboard implements OnInit {
  stats = signal({ totalReceivable: 0, totalSales: 0, totalPurchases: 0, paymentsToday: 0, customerCount: 0 });
  monthlySummary = signal<any[]>([]);
  private maxAmount = 1;

  constructor(private dashboardApi: DashboardApiService) {}

  ngOnInit() {
    this.dashboardApi.getStats().subscribe((data) => this.stats.set(data));
    this.dashboardApi.getMonthlySummary().subscribe((data) => {
      this.monthlySummary.set(data);
      this.maxAmount = Math.max(
        1,
        ...data.flatMap((m: any) => [m.sales, m.purchases, m.payments]),
      );
    });
  }

  getBarHeight(value: number): number {
    return Math.max(2, (value / this.maxAmount) * 100);
  }

  formatMonth(month: string): string {
    const [y, m] = month.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[+m - 1] + ' ' + y.slice(2);
  }
}
