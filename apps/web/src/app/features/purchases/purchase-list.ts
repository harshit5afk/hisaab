import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { PurchasesApiService } from '../../core/api/purchases-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatSnackBarModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Purchases</h1>
      <a mat-flat-button color="primary" routerLink="/purchases/new">
        <mat-icon>add</mat-icon> Add Purchase
      </a>
    </div>
    <div class="card">
      <table mat-table [dataSource]="purchases()" class="full-width">
        <ng-container matColumnDef="billNo"><th mat-header-cell *matHeaderCellDef>Bill #</th><td mat-cell *matCellDef="let p">{{ p.billNo || '—' }}</td></ng-container>
        <ng-container matColumnDef="vendor"><th mat-header-cell *matHeaderCellDef>Vendor</th><td mat-cell *matCellDef="let p">{{ p.vendor }}</td></ng-container>
        <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let p">{{ p.date | date:'dd MMM yyyy' }}</td></ng-container>
        <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef>Amount</th><td mat-cell *matCellDef="let p" class="amount-cell">{{ p.amount | paiseToRupees }}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let p"><button mat-icon-button color="warn" (click)="delete(p.id)"><mat-icon>delete</mat-icon></button></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </div>
  `,
  styles: [`.full-width { width: 100%; } .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }`],
})
export default class PurchaseList implements OnInit {
  purchases = signal<any[]>([]);
  columns = ['billNo', 'vendor', 'date', 'amount', 'actions'];
  constructor(private api: PurchasesApiService, private snackBar: MatSnackBar) {}
  ngOnInit() { this.load(); }
  load() { this.api.findAll().subscribe((r) => this.purchases.set(r.data)); }
  delete(id: string) {
    if (confirm('Delete this purchase?')) {
      this.api.delete(id).subscribe({ next: () => this.load(), error: () => this.snackBar.open('Failed', 'OK', { duration: 3000 }) });
    }
  }
}
