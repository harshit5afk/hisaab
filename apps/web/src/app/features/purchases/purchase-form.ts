import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PurchasesApiService } from '../../core/api/purchases-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-header"><h1>New Purchase</h1></div>
    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline"><mat-label>Bill No.</mat-label><input matInput formControlName="billNo" placeholder="e.g. INV-1024" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Vendor</mat-label><input matInput formControlName="vendor" placeholder="Supplier or Shop Name" /></mat-form-field>
        <div class="row-fields">
          <mat-form-field appearance="outline" class="flex-1"><mat-label>Date</mat-label><input matInput type="date" formControlName="date" /></mat-form-field>
          <mat-form-field appearance="outline" class="flex-1"><mat-label>Quantity</mat-label><input matInput type="number" formControlName="quantity" min="0.01" step="any" placeholder="1" /></mat-form-field>
        </div>
        <mat-form-field appearance="outline"><mat-label>Total Amount (₹)</mat-label><input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" /><span matPrefix>₹&nbsp;</span></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Description / Notes</mat-label><textarea matInput formControlName="description" rows="3" placeholder="Items purchased, payment terms, or notes"></textarea></mat-form-field>
        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/purchases'])">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Save Purchase</button>
        </div>
      </form>
    </div>
  `,
  styles: [`.form-card { max-width: 600px; } form { display: flex; flex-direction: column; gap: 4px; } .row-fields { display: flex; gap: 12px; } .flex-1 { flex: 1; } .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }`],
})
export default class PurchaseForm implements OnInit {
  form: FormGroup;
  constructor(
    private fb: FormBuilder,
    private api: PurchasesApiService,
    public router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      billNo: [''],
      vendor: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      quantity: [1, [Validators.min(0.01)]],
      amountRupees: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['vendor']) this.form.patchValue({ vendor: params['vendor'] });
      if (params['billNo']) this.form.patchValue({ billNo: params['billNo'] });
      if (params['date']) this.form.patchValue({ date: params['date'] });
      if (params['amount']) this.form.patchValue({ amountRupees: Number(params['amount']) });
      if (params['quantity']) this.form.patchValue({ quantity: Number(params['quantity']) });
    });
  }

  save() {
    const v = this.form.value;
    const payload = {
      billNo: v.billNo || undefined,
      vendor: v.vendor,
      date: v.date,
      quantity: v.quantity !== null && v.quantity !== '' ? Number(v.quantity) : 1,
      amount: Math.round(Number(v.amountRupees) * 100),
      description: v.description || undefined,
    };

    this.api.create(payload).subscribe({
      next: () => {
        this.snackBar.open('Purchase saved successfully', 'OK', { duration: 3000 });
        this.router.navigate(['/purchases']);
      },
      error: () => this.snackBar.open('Failed to save purchase', 'OK', { duration: 3000 }),
    });
  }
}
