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
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          <mat-icon matPrefix>person</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" />
          <mat-icon matPrefix>phone</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Address</mat-label>
          <textarea matInput formControlName="address" rows="3"></textarea>
          <mat-icon matPrefix>location_on</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>GSTIN</mat-label>
          <input matInput formControlName="gstin" placeholder="e.g. 07AABCU9603R1ZM" />
          <mat-icon matPrefix>verified</mat-icon>
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
    const data = this.form.value;

    const obs = this.isEdit()
      ? this.api.update(this.editId, data)
      : this.api.create(data);

    obs.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Customer updated' : 'Customer created', 'OK', { duration: 3000 });
        this.router.navigate(['/customers']);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save customer', 'OK', { duration: 3000 });
      },
    });
  }

  cancel() { this.router.navigate(['/customers']); }
}
