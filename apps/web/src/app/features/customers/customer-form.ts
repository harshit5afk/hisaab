import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CustomersApiService } from '../../core/api/customers-api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-header">
      <h1>{{ isEdit() ? 'Edit Customer' : 'New Customer' }}</h1>
    </div>

    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Customer Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Ramesh Traders / Sharma Ji" />
          <mat-icon matPrefix>person</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone Number (Optional)</mat-label>
          <input matInput formControlName="phone" placeholder="e.g. 9829012345" />
          <mat-icon matPrefix>phone</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Address (Optional)</mat-label>
          <textarea matInput formControlName="address" rows="3" placeholder="Shop/Office address"></textarea>
          <mat-icon matPrefix>location_on</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>GSTIN (Optional)</mat-label>
          <input matInput formControlName="gstin" placeholder="e.g. 08AABCH1111H1Z1" maxlength="15" />
          <mat-icon matPrefix>verified</mat-icon>
          <mat-hint>Leave empty if customer does not have GSTIN (B2C/Unregistered)</mat-hint>
        </mat-form-field>

        <div class="form-actions">
          <button mat-button type="button" (click)="cancel()">Cancel</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : (isEdit() ? 'Update' : 'Create') }}
          </button>
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
export default class CustomerForm implements OnInit {
  form: FormGroup;
  isEdit = signal(false);
  saving = signal(false);
  private editId = '';

  constructor(
    private fb: FormBuilder,
    private api: CustomersApiService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      address: [''],
      gstin: [''],
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId = id;
      this.api.findOne(id).subscribe((c) => this.form.patchValue(c));
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const formVal = this.form.value;
    const data = {
      name: formVal.name?.trim(),
      phone: formVal.phone?.trim() || null,
      address: formVal.address?.trim() || null,
      gstin: formVal.gstin?.trim() ? formVal.gstin.trim().toUpperCase() : null,
    };

    const obs = this.isEdit()
      ? this.api.update(this.editId, data)
      : this.api.create(data);

    obs.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Customer updated' : 'Customer created', 'OK', { duration: 3000 });
        this.router.navigate(['/customers']);
      },
      error: (err) => {
        this.saving.set(false);
        const errObj = err?.error;
        let msg = 'Failed to save customer';
        if (typeof errObj?.message === 'string') {
          msg = errObj.message;
        } else if (Array.isArray(errObj?.message)) {
          msg = errObj.message.join(', ');
        }
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  cancel() { this.router.navigate(['/customers']); }
}
