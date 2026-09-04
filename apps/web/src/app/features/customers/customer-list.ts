import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomersApiService } from '../../core/api/customers-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <h1>Customers</h1>
      <a mat-flat-button color="primary" routerLink="/customers/new">
        <mat-icon>person_add</mat-icon> Add Customer
      </a>
    </div>

    <div class="card">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search customers...</mat-label>
        <input matInput [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Name, phone, or GSTIN" />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <table mat-table [dataSource]="customers()" class="full-width">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
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
          <td mat-cell *matCellDef="let c">
            <a mat-icon-button [routerLink]="['/customers', c.id]" matTooltip="View">
              <mat-icon>visibility</mat-icon>
            </a>
            <button mat-icon-button color="warn" (click)="deleteCustomer(c.id, c.name)" matTooltip="Delete">
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
  `,
  styles: [`
    .search-field { width: 100%; margin-bottom: 16px; }
    .full-width { width: 100%; }
    .empty-state {
      text-align: center; padding: 48px 0; color: var(--text-muted);
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
    }
  `],
})
export default class CustomerList implements OnInit {
  customers = signal<any[]>([]);
  search = '';
  displayedColumns = ['name', 'phone', 'gstin', 'actions'];
  private searchTimeout: any;

  constructor(private api: CustomersApiService, private snackBar: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.findAll({ search: this.search }).subscribe((res) => this.customers.set(res.data));
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(), 300);
  }

  deleteCustomer(id: string, name: string) {
    if (confirm(`Delete customer "${name}"?`)) {
      this.api.delete(id).subscribe({
        next: () => { this.load(); this.snackBar.open('Customer deleted', 'OK', { duration: 3000 }); },
        error: () => this.snackBar.open('Failed to delete customer', 'OK', { duration: 3000 }),
      });
    }
  }
}
