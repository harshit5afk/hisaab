import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { PurchasesApiService } from '../../core/api/purchases-api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    PaiseToRupeesPipe,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Purchases ({{ purchases().length }})</h1>
        <p class="subtitle">Record raw materials, supplier bills and stock additions</p>
      </div>
      <a mat-flat-button color="primary" routerLink="/purchases/new">
        <mat-icon>add</mat-icon> Add Purchase
      </a>
    </div>

    <!-- Bulk Action Bar -->
    @if (selectedIds().size > 0) {
      <div class="bulk-action-bar">
        <div class="bulk-info">
          <span class="bulk-count">{{ selectedIds().size }}</span>
          <span>purchase{{ selectedIds().size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button mat-button (click)="clearSelection()">Clear Selection</button>
          <button mat-flat-button color="warn" (click)="openBulkDeleteModal()">
            <mat-icon>delete</mat-icon> Delete Selected ({{ selectedIds().size }})
          </button>
        </div>
      </div>
    }

    <div class="card table-card">
      <table mat-table [dataSource]="purchases()" class="full-width">
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef class="select-col">
            <mat-checkbox
              [checked]="isAllSelected()"
              [indeterminate]="isSomeSelected()"
              (change)="toggleSelectAll()"
              color="primary"
            ></mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let p" class="select-col">
            <mat-checkbox
              [checked]="selectedIds().has(p.id)"
              (change)="toggleSelect(p.id)"
              (click)="$event.stopPropagation()"
              color="primary"
            ></mat-checkbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="billNo">
          <th mat-header-cell *matHeaderCellDef>Bill #</th>
          <td mat-cell *matCellDef="let p">{{ p.billNo || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="product">
          <th mat-header-cell *matHeaderCellDef>Product</th>
          <td mat-cell *matCellDef="let p">
            @if (p.product) {
              <a
                [routerLink]="['/products']"
                [queryParams]="{ search: p.product.name }"
                class="product-chip clickable-chip"
                matTooltip="View product in catalog"
              >
                <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">inventory_2</mat-icon>
                <span class="product-chip-name">{{ p.product.name }}</span>
                <span class="unit-badge">{{ p.product.unit }}</span>
              </a>
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

        <ng-container matColumnDef="rate">
          <th mat-header-cell *matHeaderCellDef>Rate</th>
          <td mat-cell *matCellDef="let p" class="rate-cell">
            @if (p.rate) {
              {{ p.rate | paiseToRupees }}
            } @else if (p.amount && p.quantity) {
              {{ (p.amount / p.quantity) | paiseToRupees }}
            } @else {
              —
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Total Amount</th>
          <td mat-cell *matCellDef="let p" class="amount-cell">{{ p.amount | paiseToRupees }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="action-cell">
            <a
              mat-icon-button
              color="primary"
              [routerLink]="['/purchases/new']"
              [queryParams]="{ productId: p.product?.id, vendor: p.vendor, unit: p.product?.unit, rate: p.rate ? (p.rate / 100) : (p.amount && p.quantity ? (p.amount / p.quantity / 100) : null) }"
              matTooltip="Buy More / Repeat Purchase"
            >
              <mat-icon>repeat</mat-icon>
            </a>
            <button mat-icon-button color="warn" matTooltip="Delete purchase" (click)="openDeleteModal(p)">
              <mat-icon>delete_outline</mat-icon>
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

    <!-- ── Single Delete Confirmation Modal ── -->
    @if (purchaseToDelete()) {
      <div class="modal-backdrop" (click)="closeDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Delete Purchase?</h2>
            </div>
            <button mat-icon-button (click)="closeDeleteModal()" class="close-btn" [disabled]="isDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to delete purchase
              <strong>{{ purchaseToDelete()?.billNo ? '#' + purchaseToDelete()?.billNo : (purchaseToDelete()?.product?.name || 'record') }}</strong>?
            </p>
            <p class="delete-submsg">
              Product stock will be adjusted accordingly.
            </p>
          </div>

          <div class="modal-footer">
            <button mat-button type="button" (click)="closeDeleteModal()" [disabled]="isDeleting()">
              Cancel
            </button>
            <button
              mat-flat-button
              color="warn"
              (click)="executeDelete()"
              [disabled]="isDeleting()"
              class="confirm-delete-btn"
            >
              <mat-icon>delete</mat-icon>
              <span>{{ isDeleting() ? 'Deleting...' : 'Yes, Delete' }}</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Bulk Delete Confirmation Modal ── -->
    @if (showBulkDeleteModal()) {
      <div class="modal-backdrop" (click)="closeBulkDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Delete Selected Purchases?</h2>
            </div>
            <button mat-icon-button (click)="closeBulkDeleteModal()" class="close-btn" [disabled]="isBulkDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to delete <strong>{{ selectedIds().size }} selected purchase{{ selectedIds().size > 1 ? 's' : '' }}</strong>?
            </p>
            <p class="delete-submsg">
              Product stock will be adjusted accordingly. This action cannot be undone.
            </p>
          </div>

          <div class="modal-footer">
            <button mat-button type="button" (click)="closeBulkDeleteModal()" [disabled]="isBulkDeleting()">
              Cancel
            </button>
            <button
              mat-flat-button
              color="warn"
              (click)="executeBulkDelete()"
              [disabled]="isBulkDeleting()"
              class="confirm-delete-btn"
            >
              <mat-icon>delete</mat-icon>
              <span>{{ isBulkDeleting() ? 'Deleting...' : 'Yes, Delete (' + selectedIds().size + ')' }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }
    .table-card {
      padding: 0;
      overflow: hidden;
      background: var(--bg-card, #131722);
    }
    .full-width { width: 100%; }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
    .text-muted { color: var(--text-muted); }
    .action-cell { text-align: right; }

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
    .rate-cell {
      font-weight: 600;
      color: #38bdf8;
      font-variant-numeric: tabular-nums;
    }
    .clickable-chip {
      text-decoration: none;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      &:hover {
        transform: translateY(-1px);
        .product-chip-name {
          color: #38bdf8;
          text-decoration: underline;
        }
      }
    }
    .product-chip-name {
      color: #f1f5f9;
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
  selectedIds = signal<Set<string>>(new Set());
  showBulkDeleteModal = signal<boolean>(false);
  isBulkDeleting = signal<boolean>(false);
  purchaseToDelete = signal<any | null>(null);
  isDeleting = signal<boolean>(false);

  columns = ['select', 'billNo', 'product', 'vendor', 'date', 'quantity', 'rate', 'amount', 'actions'];

  isAllSelected = computed(() => {
    const list = this.purchases();
    const sel = this.selectedIds();
    return list.length > 0 && list.every((p) => sel.has(p.id));
  });

  isSomeSelected = computed(() => {
    const list = this.purchases();
    const sel = this.selectedIds();
    return sel.size > 0 && !this.isAllSelected();
  });

  constructor(private api: PurchasesApiService, private snackBar: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.findAll().subscribe((r) => {
      this.purchases.set(r.data);
      const activeIds = new Set(r.data.map((p: any) => p.id));
      const currentSel = this.selectedIds();
      const nextSel = new Set<string>();
      for (const id of currentSel) {
        if (activeIds.has(id)) nextSel.add(id);
      }
      if (nextSel.size !== currentSel.size) {
        this.selectedIds.set(nextSel);
      }
    });
  }

  toggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.purchases().map((p) => p.id)));
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  openBulkDeleteModal() {
    if (this.selectedIds().size === 0) return;
    this.showBulkDeleteModal.set(true);
  }

  closeBulkDeleteModal() {
    if (this.isBulkDeleting()) return;
    this.showBulkDeleteModal.set(false);
  }

  executeBulkDelete() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.isBulkDeleting.set(true);
    this.api.deleteMany(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.snackBar.open(res.message || `${ids.length} purchases deleted`, 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Failed to delete selected purchases', 'OK', { duration: 3000 });
      },
    });
  }

  openDeleteModal(purchase: any) {
    this.purchaseToDelete.set(purchase);
  }

  closeDeleteModal() {
    if (this.isDeleting()) return;
    this.purchaseToDelete.set(null);
  }

  executeDelete() {
    const p = this.purchaseToDelete();
    if (!p) return;

    this.isDeleting.set(true);
    this.api.delete(p.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        if (this.selectedIds().has(p.id)) {
          const next = new Set(this.selectedIds());
          next.delete(p.id);
          this.selectedIds.set(next);
        }
        this.purchaseToDelete.set(null);
        this.snackBar.open('Purchase deleted successfully', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Failed to delete purchase', 'OK', { duration: 3000 });
      },
    });
  }
}
