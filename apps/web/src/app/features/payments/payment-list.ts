import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { PaymentsApiService } from '../../core/api/payments-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Payments</h1>
      <a mat-flat-button color="primary" routerLink="/payments/new"><mat-icon>add</mat-icon> Record Payment</a>
    </div>
    <div class="card">
      <table mat-table [dataSource]="payments()" class="full-width">
        <ng-container matColumnDef="customer"><th mat-header-cell *matHeaderCellDef>Customer</th><td mat-cell *matCellDef="let p">{{ p.customer?.name }}</td></ng-container>
        <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let p">{{ p.date | date:'dd MMM yyyy' }}</td></ng-container>
        <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let p" class="amount-cell">{{ p.amount | paiseToRupees }}</td></ng-container>
        <ng-container matColumnDef="mode"><th mat-header-cell *matHeaderCellDef>Mode</th><td mat-cell *matCellDef="let p"><span class="badge badge-paid">{{ p.mode }}</span></td></ng-container>
        <ng-container matColumnDef="invoice"><th mat-header-cell *matHeaderCellDef>Invoice</th><td mat-cell *matCellDef="let p">{{ p.invoice?.invoiceNo || '—' }}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let p"><button mat-icon-button color="warn" (click)="delete(p.id)"><mat-icon>delete</mat-icon></button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </div>
  `,
  styles: [`.full-width { width: 100%; } .amount-cell { font-weight: 600; color: var(--accent-green); font-variant-numeric: tabular-nums; }`],
})
export default class PaymentList implements OnInit {
  payments = signal<any[]>([]);
  columns = ['customer', 'date', 'amount', 'mode', 'invoice', 'actions'];
  constructor(private api: PaymentsApiService, private snackBar: MatSnackBar) {}
  ngOnInit() { this.load(); }
  load() { this.api.findAll().subscribe((r) => this.payments.set(r.data)); }
  delete(id: string) {
    if (confirm('Delete this payment?')) {
      this.api.delete(id).subscribe({ next: () => this.load(), error: () => this.snackBar.open('Failed', 'OK', { duration: 3000 }) });
    }
  }
}
