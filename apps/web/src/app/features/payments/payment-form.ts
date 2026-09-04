import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaymentsApiService } from '../../core/api/payments-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';
import { SalesApiService } from '../../core/api/sales-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-header"><h1>Record Payment</h1></div>
    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Customer</mat-label>
          <mat-select formControlName="customerId" (selectionChange)="onCustomerChange()">
            @for (c of customers(); track c.id) { <mat-option [value]="c.id">{{ c.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Link to Invoice (optional)</mat-label>
          <mat-select formControlName="invoiceId">
            <mat-option value="">— None —</mat-option>
            @for (inv of invoices(); track inv.id) { <mat-option [value]="inv.id">{{ inv.invoiceNo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Date</mat-label><input matInput type="date" formControlName="date" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Amount (₹)</mat-label><input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" /><span matPrefix>₹&nbsp;</span></mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Payment Mode</mat-label>
          <mat-select formControlName="mode">
            <mat-option value="CASH">Cash</mat-option>
            <mat-option value="UPI">UPI</mat-option>
            <mat-option value="BANK_TRANSFER">Bank Transfer</mat-option>
            <mat-option value="CHEQUE">Cheque</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Note</mat-label><input matInput formControlName="note" /></mat-form-field>
        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/payments'])">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Record Payment</button>
        </div>
      </form>
    </div>
  `,
  styles: [`.form-card { max-width: 600px; } form { display: flex; flex-direction: column; gap: 4px; } .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }`],
})
export default class PaymentForm implements OnInit {
  form: FormGroup;
  customers = signal<any[]>([]);
  invoices = signal<any[]>([]);
  constructor(private fb: FormBuilder, private api: PaymentsApiService, private customersApi: CustomersApiService, private salesApi: SalesApiService, public router: Router, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      customerId: ['', Validators.required], invoiceId: [''], date: [new Date().toISOString().split('T')[0], Validators.required],
      amountRupees: [null, [Validators.required, Validators.min(0.01)]], mode: ['CASH', Validators.required], note: [''],
    });
  }
  ngOnInit() { this.customersApi.findAll({ limit: 100 }).subscribe((r) => this.customers.set(r.data)); }
  onCustomerChange() {
    const cid = this.form.value.customerId;
    if (cid) this.salesApi.findAll({ customerId: cid, limit: 50 }).subscribe((r) => this.invoices.set(r.data));
  }
  save() {
    const v = this.form.value;
    this.api.create({ customerId: v.customerId, invoiceId: v.invoiceId || undefined, date: v.date, amount: Math.round(v.amountRupees * 100), mode: v.mode, note: v.note }).subscribe({
      next: () => { this.snackBar.open('Payment recorded', 'OK', { duration: 3000 }); this.router.navigate(['/payments']); },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed', 'OK', { duration: 3000 }),
    });
  }
}
