import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
        <mat-form-field appearance="outline"><mat-label>Bill No.</mat-label><input matInput formControlName="billNo" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Vendor</mat-label><input matInput formControlName="vendor" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Date</mat-label><input matInput type="date" formControlName="date" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Amount (₹)</mat-label><input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" /><span matPrefix>₹&nbsp;</span></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Description</mat-label><textarea matInput formControlName="description" rows="3"></textarea></mat-form-field>
        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/purchases'])">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Save</button>
        </div>
      </form>
    </div>
  `,
  styles: [`.form-card { max-width: 600px; } form { display: flex; flex-direction: column; gap: 4px; } .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }`],
})
export default class PurchaseForm {
  form: FormGroup;
  constructor(private fb: FormBuilder, private api: PurchasesApiService, public router: Router, private snackBar: MatSnackBar) {
    this.form = this.fb.group({ billNo: [''], vendor: ['', Validators.required], date: [new Date().toISOString().split('T')[0], Validators.required], amountRupees: [null, [Validators.required, Validators.min(0.01)]], description: [''] });
  }
  save() {
    const v = this.form.value;
    this.api.create({ billNo: v.billNo, vendor: v.vendor, date: v.date, amount: Math.round(v.amountRupees * 100), description: v.description }).subscribe({
      next: () => { this.snackBar.open('Purchase saved', 'OK', { duration: 3000 }); this.router.navigate(['/purchases']); },
      error: () => this.snackBar.open('Failed', 'OK', { duration: 3000 }),
    });
  }
}
