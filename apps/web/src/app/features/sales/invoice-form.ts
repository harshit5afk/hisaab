import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesApiService } from '../../core/api/sales-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-header"><h1>New Invoice</h1></div>
    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Customer</mat-label>
          <mat-select formControlName="customerId">
            @for (c of customers(); track c.id) {
              <mat-option [value]="c.id">{{ c.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Amount (₹)</mat-label>
          <input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" />
          <span matPrefix>₹&nbsp;</span>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/sales'])">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Create Invoice</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .form-card { max-width: 600px; }
    form { display: flex; flex-direction: column; gap: 4px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }
  `],
})
export default class InvoiceForm implements OnInit {
  form: FormGroup;
  customers = signal<any[]>([]);

  constructor(
    private fb: FormBuilder,
    private salesApi: SalesApiService,
    private customersApi: CustomersApiService,
    public router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      customerId: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      amountRupees: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.customersApi.findAll({ limit: 100 }).subscribe((res) => this.customers.set(res.data));
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.salesApi.create({
      customerId: v.customerId,
      date: v.date,
      amount: Math.round(v.amountRupees * 100), // convert ₹ to paise
      description: v.description,
    }).subscribe({
      next: () => {
        this.snackBar.open('Invoice created', 'OK', { duration: 3000 });
        this.router.navigate(['/sales']);
      },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed', 'OK', { duration: 3000 }),
    });
  }
}
