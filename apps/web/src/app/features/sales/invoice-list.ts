import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { SalesApiService } from '../../core/api/sales-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule, MatTooltipModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Sales / Invoices</h1>
      <a mat-flat-button color="primary" routerLink="/sales/new">
        <mat-icon>add</mat-icon> New Invoice
      </a>
    </div>

    <div class="card">
      <table mat-table [dataSource]="invoices()" class="full-width">
        <ng-container matColumnDef="invoiceNo">
          <th mat-header-cell *matHeaderCellDef>Invoice #</th>
          <td mat-cell *matCellDef="let i">
            <span class="invoice-no">{{ i.invoiceNo }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="customer">
          <th mat-header-cell *matHeaderCellDef>Customer</th>
          <td mat-cell *matCellDef="let i">{{ i.customer?.name || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let i">{{ i.date | date:'dd MMM yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount</th>
          <td mat-cell *matCellDef="let i" class="amount-cell">{{ i.amount | paiseToRupees }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let i">
            <span class="badge" [class]="'badge-' + i.status.toLowerCase()">{{ i.status }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let i">
            <button mat-icon-button matTooltip="Download PDF" (click)="downloadInvoice(i.id)">
              <mat-icon>picture_as_pdf</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="deleteInvoice(i.id)" [disabled]="i.status !== 'DRAFT'">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .invoice-no { font-family: monospace; font-weight: 600; color: var(--accent-indigo); }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
  `],
})
export default class InvoiceList implements OnInit {
  invoices = signal<any[]>([]);
  displayedColumns = ['invoiceNo', 'customer', 'date', 'amount', 'status', 'actions'];

  constructor(private api: SalesApiService, private snackBar: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.findAll().subscribe((res) => this.invoices.set(res.data));
  }

  downloadInvoice(id: string) {
    this.api.downloadInvoicePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Could not generate invoice PDF', 'OK', { duration: 3000 }),
    });
  }

  deleteInvoice(id: string) {
    if (confirm('Delete this draft invoice?')) {
      this.api.delete(id).subscribe({
        next: () => { this.load(); this.snackBar.open('Invoice deleted', 'OK', { duration: 3000 }); },
        error: (err) => this.snackBar.open(err.error?.message || 'Cannot delete', 'OK', { duration: 3000 }),
      });
    }
  }
}
