import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { PurchasesApiService } from '../../core/api/purchases-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Purchases</h1>
      <a mat-flat-button color="primary" routerLink="/purchases/new">
        <mat-icon>add</mat-icon> Add Purchase
      </a>
    </div>
    <div class="card">
      <table mat-table [dataSource]="purchases()" class="full-width">

        <ng-container matColumnDef="billNo">
          <th mat-header-cell *matHeaderCellDef>Bill #</th>
          <td mat-cell *matCellDef="let p">{{ p.billNo || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="product">
          <th mat-header-cell *matHeaderCellDef>Product</th>
          <td mat-cell *matCellDef="let p">
            @if (p.product) {
              <span class="product-chip">
                <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">inventory_2</mat-icon>
                {{ p.product.name }}
                <span class="unit-badge">{{ p.product.unit }}</span>
              </span>
            } @else {
              <span class="text-muted">—</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="vendor">
          <th mat-header-cell *matHeaderCellDef>Vendor</th>
          <td mat-cell *matCellDef="let p">{{ p.vendor || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let p">{{ p.date | date:'dd MMM yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="quantity">
          <th mat-header-cell *matHeaderCellDef>Qty</th>
          <td mat-cell *matCellDef="let p">
            {{ p.quantity ?? 1 }}
            @if (p.product?.unit) {
              <span class="unit-label">{{ p.product.unit }}</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount</th>
          <td mat-cell *matCellDef="let p" class="amount-cell">{{ p.amount | paiseToRupees }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button color="warn" (click)="delete(p.id)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>

        @if (purchases().length === 0) {
          <tr class="mat-row">
            <td [attr.colspan]="columns.length" class="empty-state">
              <mat-icon>receipt_long</mat-icon>
              <p>No purchases yet. <a routerLink="/purchases/new">Add your first purchase</a></p>
            </td>
          </tr>
        }
      </table>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
    .text-muted { color: var(--text-muted); }

    .product-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }
    .unit-badge {
      font-size: 0.7rem;
      background: rgba(138, 180, 248, 0.15);
      color: #8ab4f8;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .unit-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-left: 2px;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);

      mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.4; display: block; margin: 0 auto 12px; }
      p { margin: 0; }
      a { color: var(--accent-primary); text-decoration: none; }
      a:hover { text-decoration: underline; }
    }
  `],
})
export default class PurchaseList implements OnInit {
  purchases = signal<any[]>([]);
  columns = ['billNo', 'product', 'vendor', 'date', 'quantity', 'amount', 'actions'];

  constructor(private api: PurchasesApiService, private snackBar: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.findAll().subscribe((r) => this.purchases.set(r.data));
  }

  delete(id: string) {
    if (confirm('Delete this purchase?')) {
      this.api.delete(id).subscribe({
        next: () => this.load(),
        error: () => this.snackBar.open('Failed to delete', 'OK', { duration: 3000 }),
      });
    }
  }
}
