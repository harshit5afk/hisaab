import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { ReceivablesApiService } from '../../core/api/receivables-api.service';

@Component({
  standalone: true,
  imports: [DatePipe, MatTableModule, MatIconModule, PaiseToRupeesPipe],
  template: `
    <div class="page-header">
      <h1>Ledger — {{ ledgerData().customer?.name }}</h1>
      <div class="final-balance" [class.overdue]="ledgerData().finalBalance > 0">
        Balance: {{ ledgerData().finalBalance | paiseToRupees }}
      </div>
    </div>

    <div class="card">
      <table mat-table [dataSource]="ledgerData().ledger" class="full-width">
        <ng-container matColumnDef="date"><th mat-header-cell *matHeaderCellDef>Date</th><td mat-cell *matCellDef="let e">{{ e.date | date:'dd MMM yyyy' }}</td></ng-container>
        <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let e">
          <span class="badge" [class.badge-sent]="e.type === 'INVOICE'" [class.badge-paid]="e.type === 'PAYMENT'">{{ e.type }}</span>
        </td></ng-container>
        <ng-container matColumnDef="reference"><th mat-header-cell *matHeaderCellDef>Reference</th><td mat-cell *matCellDef="let e">{{ e.reference }}</td></ng-container>
        <ng-container matColumnDef="debit"><th mat-header-cell *matHeaderCellDef>Debit</th><td mat-cell *matCellDef="let e" class="debit">{{ e.debit ? (e.debit | paiseToRupees) : '' }}</td></ng-container>
        <ng-container matColumnDef="credit"><th mat-header-cell *matHeaderCellDef>Credit</th><td mat-cell *matCellDef="let e" class="credit">{{ e.credit ? (e.credit | paiseToRupees) : '' }}</td></ng-container>
        <ng-container matColumnDef="runningBalance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let e" class="running-bal">{{ e.runningBalance | paiseToRupees }}</td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .final-balance { font-size: 1.25rem; font-weight: 700; &.overdue { color: var(--accent-red); } }
    .debit { color: var(--accent-red); font-weight: 600; font-variant-numeric: tabular-nums; }
    .credit { color: var(--accent-green); font-weight: 600; font-variant-numeric: tabular-nums; }
    .running-bal { font-weight: 600; font-variant-numeric: tabular-nums; }
  `],
})
export default class CustomerLedger implements OnInit {
  ledgerData = signal<any>({ customer: {}, ledger: [], finalBalance: 0 });
  columns = ['date', 'type', 'reference', 'debit', 'credit', 'runningBalance'];
  constructor(private route: ActivatedRoute, private api: ReceivablesApiService) {}
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('customerId')!;
    this.api.getLedger(id).subscribe((data) => this.ledgerData.set(data));
  }
}
