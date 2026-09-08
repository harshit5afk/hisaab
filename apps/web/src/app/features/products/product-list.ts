import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductsApiService, Product } from '../../core/api/products-api.service';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
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

    <!-- Table -->
    <div class="card table-card">
      <table mat-table [dataSource]="products()" class="full-width">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Product / Item Name</th>
          <td mat-cell *matCellDef="let p">
            <span class="product-name">{{ p.name }}</span>
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

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="action-cell">
            <button mat-icon-button color="warn" (click)="deleteProduct(p.id)" matTooltip="Delete product">
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
  displayedColumns = ['name', 'hsn', 'unit', 'rate', 'actions'];

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
      },
    });
  }

  onSearch() {
    this.load();
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

  deleteProduct(id: string) {
    if (confirm('Remove this product from catalog?')) {
      this.productsApi.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Product removed', 'OK', { duration: 3000 });
          this.load();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Cannot delete', 'OK', { duration: 3000 });
        },
      });
    }
  }
}
