import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomersApiService } from '../../core/api/customers-api.service';

@Component({
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Customers</h1>
      <a mat-flat-button color="primary" routerLink="/customers/new">
        <mat-icon>person_add</mat-icon> Add Customer
      </a>
    </div>

    <div class="card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search customers by name, phone, or GSTIN...</mat-label>
        <input matInput [(ngModel)]="search" (ngModelChange)="onSearch()" />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <table mat-table [dataSource]="customers()" class="full-width">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let c" class="name-cell" (click)="openViewModal(c)">
            {{ c.name }}
          </td>
        </ng-container>

        <ng-container matColumnDef="phone">
          <th mat-header-cell *matHeaderCellDef>Phone</th>
          <td mat-cell *matCellDef="let c">{{ c.phone || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="gstin">
          <th mat-header-cell *matHeaderCellDef>GSTIN</th>
          <td mat-cell *matCellDef="let c">{{ c.gstin || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let c" class="action-cell">
            <button
              mat-icon-button
              class="view-icon-btn"
              (click)="openViewModal(c)"
              matTooltip="View profile & ledger"
            >
              <mat-icon>visibility</mat-icon>
            </button>
            <a
              mat-icon-button
              class="edit-icon-btn"
              [routerLink]="['/customers', c.id]"
              matTooltip="Edit customer"
            >
              <mat-icon>edit</mat-icon>
            </a>
            <button
              mat-icon-button
              color="warn"
              class="delete-icon-btn"
              (click)="openDeleteModal(c)"
              matTooltip="Delete customer"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      @if (customers().length === 0) {
        <div class="empty-state">
          <mat-icon>people_outline</mat-icon>
          <p>No customers found</p>
        </div>
      }
    </div>

    <!-- ── Customer View / Profile Modal ── -->
    @if (viewingCustomer()) {
      <div class="modal-backdrop" (click)="closeViewModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-info">
              <mat-icon class="header-icon">person</mat-icon>
              <h2>{{ viewingCustomer()?.name }}</h2>
            </div>
            <button mat-icon-button (click)="closeViewModal()" class="close-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Phone Number</span>
                <span class="detail-val">{{ viewingCustomer()?.phone || 'Not provided' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">GSTIN</span>
                <span class="detail-val">{{ viewingCustomer()?.gstin || 'Unregistered' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">State / Place of Supply</span>
                <span class="detail-val">{{ viewingCustomer()?.state || 'RAJASTHAN' }}</span>
              </div>
              <div class="detail-item full-span">
                <span class="detail-label">Billing Address</span>
                <span class="detail-val">{{ viewingCustomer()?.address || 'Not provided' }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <a
              mat-stroked-button
              [routerLink]="['/receivables', viewingCustomer()?.id]"
              (click)="closeViewModal()"
              class="ledger-btn"
            >
              <mat-icon>account_balance_wallet</mat-icon> View Ledger
            </a>
            <a
              mat-stroked-button
              [routerLink]="['/customers', viewingCustomer()?.id]"
              (click)="closeViewModal()"
              class="edit-btn"
            >
              <mat-icon>edit</mat-icon> Edit Details
            </a>
            <button mat-flat-button color="primary" (click)="closeViewModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Delete Confirmation Modal ── -->
    @if (customerToDelete()) {
      <div class="modal-backdrop" (click)="closeDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Delete Customer?</h2>
            </div>
            <button mat-icon-button (click)="closeDeleteModal()" class="close-btn" [disabled]="isDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to delete <strong>{{ customerToDelete()?.name }}</strong>?
            </p>
            <p class="delete-submsg">
              This customer will be archived and removed from your active customer list.
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
  `,
  styles: [`
    .search-field {
      width: 100%;
      margin-bottom: 16px;
    }
    .full-width {
      width: 100%;
    }
    .name-cell {
      cursor: pointer;
      font-weight: 600;
      color: #f8fafc;
      transition: color 0.15s ease;
      &:hover {
        color: #38bdf8 !important;
        text-decoration: underline;
      }
    }
    .action-cell {
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .view-icon-btn {
      color: #94a3b8;
      &:hover { color: #38bdf8 !important; }
    }
    .edit-icon-btn {
      color: #94a3b8;
      &:hover { color: #60a5fa !important; }
    }
    .delete-icon-btn {
      color: #f87171;
      &:hover { color: #ef4444 !important; }
    }
    .empty-state {
      text-align: center;
      padding: 48px 0;
      color: var(--text-muted);
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
    }

    /* Modal Backdrop and Card */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    .delete-modal-card {
      max-width: 440px;
    }

    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .header-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .header-icon {
          color: #38bdf8;
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }
      }

      .close-btn {
        color: #94a3b8;
        &:hover { color: #f8fafc; }
      }
    }

    .warn-icon-bubble {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        color: #ef4444;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .modal-body {
      padding: 24px;

      .delete-msg {
        font-size: 1rem;
        color: #f1f5f9;
        margin-bottom: 8px;

        strong {
          color: #38bdf8;
        }
      }

      .delete-submsg {
        font-size: 0.85rem;
        color: #94a3b8;
        margin: 0;
      }
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      .full-span {
        grid-column: span 2;
      }
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;

      .detail-label {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #93c5fd;
        letter-spacing: 0.5px;
      }

      .detail-val {
        font-size: 0.92rem;
        font-weight: 500;
        color: #f8fafc;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding: 16px 24px;
      background: rgba(0, 0, 0, 0.2);
      border-top: 1px solid rgba(255, 255, 255, 0.08);

      .ledger-btn {
        color: #38bdf8;
        border-color: rgba(56, 189, 248, 0.4);
        &:hover { background: rgba(56, 189, 248, 0.1); }
      }

      .edit-btn {
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.2);
        &:hover { background: rgba(255, 255, 255, 0.05); }
      }

      .confirm-delete-btn {
        background: #dc2626 !important;
        color: #ffffff !important;
        &:hover { background: #b91c1c !important; }
      }
    }
  `],
})
export default class CustomerList implements OnInit {
  customers = signal<any[]>([]);
  search = '';
  displayedColumns = ['name', 'phone', 'gstin', 'actions'];
  viewingCustomer = signal<any | null>(null);
  customerToDelete = signal<any | null>(null);
  isDeleting = signal(false);

  private searchTimeout: any;

  constructor(
    private api: CustomersApiService,
    private snackBar: MatSnackBar,
    public router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.findAll({ search: this.search }).subscribe({
      next: (res) => this.customers.set(res.data),
      error: () => this.snackBar.open('Failed to load customers', 'OK', { duration: 3000 }),
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(), 300);
  }

  openViewModal(customer: any) {
    this.viewingCustomer.set(customer);
  }

  closeViewModal() {
    this.viewingCustomer.set(null);
  }

  openDeleteModal(customer: any) {
    this.customerToDelete.set(customer);
  }

  closeDeleteModal() {
    if (!this.isDeleting()) {
      this.customerToDelete.set(null);
    }
  }

  executeDelete() {
    const customer = this.customerToDelete();
    if (!customer) return;

    this.isDeleting.set(true);
    this.api.delete(customer.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.customerToDelete.set(null);
        this.snackBar.open(`Customer "${customer.name}" deleted successfully`, 'OK', {
          duration: 3500,
        });
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err.error?.message || 'Failed to delete customer';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }
}
