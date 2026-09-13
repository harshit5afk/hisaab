import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductsApiService, Product } from '../../core/api/products-api.service';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    PaiseToRupeesPipe,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Product Catalog ({{ total() }})</h1>
        <p class="subtitle">Manage water purifier parts, filters, pumps & accessories</p>
      </div>
      <button mat-flat-button color="primary" (click)="openCreateModal()">
        <mat-icon>add</mat-icon> Add New Product
      </button>
    </div>

    <!-- Search Bar -->
    <div class="card search-card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search products by name or HSN...</mat-label>
        <input
          matInput
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
        />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>
    </div>

    <!-- Quick Add Form -->
    @if (showCreate()) {
      <div class="card add-card">
        <h3>+ Add Product to Catalog</h3>
        <div class="add-grid">
          <mat-form-field appearance="outline">
            <mat-label>Product Name *</mat-label>
            <input matInput [(ngModel)]="newProd.name" placeholder="e.g. PRE CARBON 10 INCH" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>HSN / SAC</mat-label>
            <input matInput [(ngModel)]="newProd.hsn" placeholder="e.g. 84219900" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Unit</mat-label>
            <input matInput [(ngModel)]="newProd.unit" placeholder="NOS, PCS, SET" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Selling Rate (₹) *</mat-label>
            <input matInput type="number" [(ngModel)]="newProd.rateRupees" placeholder="450.00" />
            <span matPrefix>₹&nbsp;</span>
          </mat-form-field>
        </div>
        <div class="add-actions">
          <button mat-button (click)="showCreate.set(false)">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!newProd.name || newProd.rateRupees < 0" (click)="saveProduct()">
            Save Product
          </button>
        </div>
      </div>
    }

    <!-- Bulk Action Bar -->
    @if (selectedIds().size > 0) {
      <div class="bulk-action-bar">
        <div class="bulk-info">
          <span class="bulk-count">{{ selectedIds().size }}</span>
          <span>product{{ selectedIds().size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button mat-button (click)="clearSelection()">Clear Selection</button>
          <button mat-flat-button color="warn" (click)="openBulkDeleteModal()">
            <mat-icon>delete</mat-icon> Delete Selected ({{ selectedIds().size }})
          </button>
        </div>
      </div>
    }

    <!-- Table -->
    <div class="card table-card">
      <table mat-table [dataSource]="products()" class="full-width">
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

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Product / Item Name</th>
          <td mat-cell *matCellDef="let p">
            <span class="product-name">{{ p.name }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="purchases">
          <th mat-header-cell *matHeaderCellDef>Recent Bill & Purchase</th>
          <td mat-cell *matCellDef="let p">
            @if (p.purchases && p.purchases.length > 0) {
              <div class="purchase-history-preview">
                @if (p.purchases[0].billNo) {
                  <span class="bill-badge">
                    <mat-icon class="mini-icon">receipt</mat-icon>
                    Bill #{{ p.purchases[0].billNo }}
                  </span>
                }
                @if (p.purchases[0].vendor) {
                  <span class="vendor-badge">
                    <mat-icon class="mini-icon">storefront</mat-icon>
                    {{ p.purchases[0].vendor }}
                  </span>
                }
                <span class="purchase-rate-badge" matTooltip="Recent purchase unit rate">
                  <mat-icon class="mini-icon">sell</mat-icon>
                  Rate: ₹{{ (((p.purchases[0].rate || (p.purchases[0].amount / (p.purchases[0].quantity || 1)))) / 100) | number:'1.2-2' }}/{{ p.unit }}
                </span>
                <span class="date-badge">
                  {{ p.purchases[0].date | date:'dd MMM yyyy' }}
                </span>
              </div>
            } @else {
              <span class="no-purchase">—</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="hsn">
          <th mat-header-cell *matHeaderCellDef>HSN / SAC</th>
          <td mat-cell *matCellDef="let p">{{ p.hsn || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="unit">
          <th mat-header-cell *matHeaderCellDef>Unit</th>
          <td mat-cell *matCellDef="let p">{{ p.unit }}</td>
        </ng-container>

        <ng-container matColumnDef="rate">
          <th mat-header-cell *matHeaderCellDef>Default Rate</th>
          <td mat-cell *matCellDef="let p" class="rate-cell">
            {{ p.rate | paiseToRupees }}
          </td>
        </ng-container>

        <ng-container matColumnDef="stock">
          <th mat-header-cell *matHeaderCellDef>Stock</th>
          <td mat-cell *matCellDef="let p">
            @if ((p.stock ?? 0) > 0) {
              <span class="stock-badge stock-ok">{{ p.stock }} {{ p.unit }}</span>
            } @else {
              <span class="stock-badge stock-empty">Out of Stock</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="action-cell">
            <a
              mat-icon-button
              color="primary"
              [routerLink]="['/purchases/new']"
              [queryParams]="{ productId: p.id, unit: p.unit }"
              matTooltip="Record Purchase / Add Stock"
            >
              <mat-icon>add_shopping_cart</mat-icon>
            </a>
            <button mat-icon-button color="warn" (click)="openDeleteModal(p)" matTooltip="Delete product">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>

      @if (products().length === 0) {
        <div class="empty-state">
          <mat-icon>inventory_2</mat-icon>
          <p>No products found. Add products to easily select them during invoice creation!</p>
        </div>
      }
    </div>

    <!-- ── Product Delete Confirmation Modal ── -->
    @if (productToDelete()) {
      <div class="modal-backdrop" (click)="closeDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Remove Product?</h2>
            </div>
            <button mat-icon-button (click)="closeDeleteModal()" class="close-btn" [disabled]="isDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to remove <strong>{{ productToDelete()?.name }}</strong> from your catalog?
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
              <span>{{ isDeleting() ? 'Removing...' : 'Yes, Remove' }}</span>
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
              <h2>Delete Selected Products?</h2>
            </div>
            <button mat-icon-button (click)="closeBulkDeleteModal()" class="close-btn" [disabled]="isBulkDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to remove <strong>{{ selectedIds().size }} selected product{{ selectedIds().size > 1 ? 's' : '' }}</strong> from your catalog?
            </p>
            <p class="delete-submsg">
              This action cannot be undone. Products linked to existing invoices or purchases cannot be deleted.
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
    .search-card {
      padding: 12px 16px;
      margin-bottom: 16px;
      background: var(--bg-card, #131722);
    }
    .search-field {
      width: 100%;
      margin-bottom: -16px;
    }
    .add-card {
      padding: 20px;
      margin-bottom: 20px;
      background: var(--bg-card, #131722);
      border: 1px solid #38bdf8;
      border-radius: 10px;

      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        color: #38bdf8;
      }
    }
    .add-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 12px;

      mat-form-field {
        margin-bottom: -16px;
      }
    }
    .add-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .table-card {
      padding: 0;
      overflow: hidden;
      background: var(--bg-card, #131722);
    }
    .full-width {
      width: 100%;
    }
    .product-name {
      font-weight: 600;
      color: #f1f5f9;
    }
    .rate-cell {
      font-weight: 700;
      color: #38bdf8;
      font-variant-numeric: tabular-nums;
    }
    .stock-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .stock-ok {
      background: rgba(74, 222, 128, 0.15);
      color: #4ade80;
      border: 1px solid rgba(74, 222, 128, 0.3);
    }
    .stock-empty {
      background: rgba(248, 113, 113, 0.12);
      color: #f87171;
      border: 1px solid rgba(248, 113, 113, 0.25);
    }
    .action-cell {
      text-align: right;
    }
    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #94a3b8;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
    }
    .purchase-history-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .bill-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.76rem;
      font-weight: 600;
      background: rgba(138, 180, 248, 0.15);
      color: #8ab4f8;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.2px;
    }
    .vendor-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.74rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .purchase-rate-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.74rem;
      font-weight: 600;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 2px 7px;
      border-radius: 4px;
    }
    .date-badge {
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .mini-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      line-height: 13px;
    }
    .no-purchase {
      color: #64748b;
      font-size: 0.85rem;
    }
    @media (max-width: 768px) {
      .add-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export default class ProductList implements OnInit {
  products = signal<Product[]>([]);
  total = signal<number>(0);
  searchQuery = '';
  showCreate = signal<boolean>(false);
  productToDelete = signal<Product | null>(null);
  isDeleting = signal<boolean>(false);

  selectedIds = signal<Set<string>>(new Set());
  showBulkDeleteModal = signal<boolean>(false);
  isBulkDeleting = signal<boolean>(false);

  displayedColumns = ['select', 'name', 'purchases', 'hsn', 'unit', 'rate', 'stock', 'actions'];

  isAllSelected = computed(() => {
    const list = this.products();
    const sel = this.selectedIds();
    return list.length > 0 && list.every((p) => sel.has(p.id));
  });

  isSomeSelected = computed(() => {
    const list = this.products();
    const sel = this.selectedIds();
    return sel.size > 0 && !this.isAllSelected();
  });

  newProd = {
    name: '',
    hsn: '',
    unit: 'NOS',
    rateRupees: 0,
  };

  constructor(
    private productsApi: ProductsApiService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.productsApi.findAll({ search: this.searchQuery, limit: 100 }).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.total.set(res.total);
        // Prune any selected IDs that no longer exist
        const activeIds = new Set(res.data.map((p) => p.id));
        const currentSel = this.selectedIds();
        const nextSel = new Set<string>();
        for (const id of currentSel) {
          if (activeIds.has(id)) nextSel.add(id);
        }
        if (nextSel.size !== currentSel.size) {
          this.selectedIds.set(nextSel);
        }
      },
    });
  }

  onSearch() {
    this.load();
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
      this.selectedIds.set(new Set(this.products().map((p) => p.id)));
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
    this.productsApi.deleteMany(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.snackBar.open(res.message || `${ids.length} products deleted`, 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Failed to delete selected products', 'OK', { duration: 3000 });
      },
    });
  }

  openCreateModal() {
    this.newProd = { name: '', hsn: '', unit: 'NOS', rateRupees: 0 };
    this.showCreate.set(true);
  }

  saveProduct() {
    if (!this.newProd.name) return;
    const ratePaise = Math.round((Number(this.newProd.rateRupees) || 0) * 100);
    this.productsApi
      .create({
        name: this.newProd.name.trim(),
        hsn: this.newProd.hsn.trim() || undefined,
        unit: this.newProd.unit.trim() || 'NOS',
        rate: ratePaise,
      })
      .subscribe({
        next: () => {
          this.showCreate.set(false);
          this.snackBar.open('Product added to catalog!', 'OK', { duration: 3000 });
          this.load();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to save product', 'OK', {
            duration: 3000,
          });
        },
      });
  }

  openDeleteModal(product: Product) {
    this.productToDelete.set(product);
  }

  closeDeleteModal() {
    if (this.isDeleting()) return;
    this.productToDelete.set(null);
  }

  executeDelete() {
    const product = this.productToDelete();
    if (!product) return;

    this.isDeleting.set(true);
    this.productsApi.delete(product.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        if (this.selectedIds().has(product.id)) {
          const next = new Set(this.selectedIds());
          next.delete(product.id);
          this.selectedIds.set(next);
        }
        this.productToDelete.set(null);
        this.snackBar.open(`"${product.name}" removed from catalog`, 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Cannot delete product', 'OK', { duration: 3000 });
      },
    });
  }
}

