import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { ReceivablesApiService } from '../../core/api/receivables-api.service';

@Component({
  standalone: true,
  imports: [RouterLink, MatTableModule, MatButtonModule, MatIconModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header"><h1>Receivables</h1></div>
    <div class="card">
      <table mat-table [dataSource]="balances()" class="full-width">
        <ng-container matColumnDef="customerName">
          <th mat-header-cell *matHeaderCellDef>Customer</th>
          <td mat-cell *matCellDef="let b">
            <a [routerLink]="['/receivables', b.customerId]" class="customer-link">{{ b.customerName }}</a>
          </td>
        </ng-container>
        <ng-container matColumnDef="totalInvoiced">
          <th mat-header-cell *matHeaderCellDef>Total Invoiced</th>
          <td mat-cell *matCellDef="let b" class="amount-cell">{{ b.totalInvoiced | paiseToRupees }}</td>
        </ng-container>
        <ng-container matColumnDef="totalPaid">
          <th mat-header-cell *matHeaderCellDef>Total Paid</th>
          <td mat-cell *matCellDef="let b" class="amount-cell paid">{{ b.totalPaid | paiseToRupees }}</td>
        </ng-container>
        <ng-container matColumnDef="balance">
          <th mat-header-cell *matHeaderCellDef>Balance Due</th>
          <td mat-cell *matCellDef="let b" class="amount-cell" [class.overdue]="b.balance > 0" [class.clear]="b.balance <= 0">
            {{ b.balance | paiseToRupees }}
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
    .paid { color: var(--accent-green); }
    .overdue { color: var(--accent-red); }
    .clear { color: var(--accent-green); }
    .customer-link { color: var(--accent-indigo); text-decoration: none; &:hover { text-decoration: underline; } }
  `],
})
export default class ReceivablesList implements OnInit {
  balances = signal<any[]>([]);
  columns = ['customerName', 'totalInvoiced', 'totalPaid', 'balance'];
  constructor(private api: ReceivablesApiService) {}
  ngOnInit() { this.api.getBalances().subscribe((data) => this.balances.set(data)); }
}
