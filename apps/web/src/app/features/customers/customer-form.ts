import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { CustomersApiService } from '../../core/api/customers-api.service';

const GST_STATE_MAP: Record<string, string> = {
  '01': 'JAMMU AND KASHMIR',
  '02': 'HIMACHAL PRADESH',
  '03': 'PUNJAB',
  '04': 'CHANDIGARH',
  '05': 'UTTARAKHAND',
  '06': 'HARYANA',
  '07': 'DELHI',
  '08': 'RAJASTHAN',
  '09': 'UTTAR PRADESH',
  '10': 'BIHAR',
  '11': 'SIKKIM',
  '12': 'ARUNACHAL PRADESH',
  '13': 'NAGALAND',
  '14': 'MANIPUR',
  '15': 'MIZORAM',
  '16': 'TRIPURA',
  '17': 'MEGHALAYA',
  '18': 'ASSAM',
  '19': 'WEST BENGAL',
  '20': 'JHARKHAND',
  '21': 'ODISHA',
  '22': 'CHHATTISGARH',
  '23': 'MADHYA PRADESH',
  '24': 'GUJARAT',
  '26': 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  '27': 'MAHARASHTRA',
  '29': 'KARNATAKA',
  '30': 'GOA',
  '31': 'LAKSHADWEEP',
  '32': 'KERALA',
  '33': 'TAMIL NADU',
  '34': 'PUDUCHERRY',
  '35': 'ANDAMAN AND NICOBAR ISLANDS',
  '36': 'TELANGANA',
  '37': 'ANDHRA PRADESH',
  '38': 'LADAKH',
};

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <div class="header-content">
        <h1>{{ isEdit() ? 'Edit Customer' : 'New Customer' }}</h1>
        <p class="subtitle">
          {{ isEdit() ? 'Update existing customer details and tax information' : 'Add a new client or business entity for billing & invoicing' }}
        </p>
      </div>
    </div>

    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <!-- Customer Name -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Customer Name *</mat-label>
          <input
            matInput
            formControlName="name"
            placeholder="e.g. Ramesh Traders / Acme Enterprises"
            autocomplete="off"
          />
          <mat-icon matPrefix>person</mat-icon>
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Customer name is required</mat-error>
          }
        </mat-form-field>

        <div class="grid-2">
          <!-- Phone Number -->
          <mat-form-field appearance="outline">
            <mat-label>Phone Number (Optional)</mat-label>
            <input
              matInput
              formControlName="phone"
              placeholder="e.g. 9829012345"
              autocomplete="off"
            />
            <mat-icon matPrefix>phone</mat-icon>
          </mat-form-field>

          <!-- GSTIN -->
          <mat-form-field appearance="outline">
            <mat-label>GSTIN (Optional)</mat-label>
            <input
              matInput
              formControlName="gstin"
              placeholder="e.g. 08AABCH1111H1Z1"
              maxlength="15"
              style="text-transform: uppercase;"
              autocomplete="off"
            />
            <mat-icon matPrefix>verified</mat-icon>
            <mat-hint>15-character GST identification number</mat-hint>
          </mat-form-field>
        </div>

        <!-- State / Place of Supply -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>State / Place of Supply (Optional)</mat-label>
          <input
            matInput
            formControlName="state"
            placeholder="e.g. RAJASTHAN, KARNATAKA, MAHARASHTRA"
            style="text-transform: uppercase;"
            autocomplete="off"
          />
          <mat-icon matPrefix>map</mat-icon>
          <mat-hint>Auto-detected from GSTIN, or enter customer state</mat-hint>
        </mat-form-field>

        <!-- Billing Address -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Billing Address (Optional)</mat-label>
          <textarea
            matInput
            formControlName="address"
            rows="3"
            placeholder="Complete shop / office address for invoices"
          ></textarea>
          <mat-icon matPrefix>location_on</mat-icon>
        </mat-form-field>

        <!-- Form Actions -->
        <div class="form-actions">
          <button mat-button type="button" (click)="cancel()" [disabled]="saving()">
            Cancel
          </button>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="saving()"
            class="submit-btn"
          >
            <mat-icon>{{ saving() ? 'hourglass_empty' : (isEdit() ? 'save' : 'person_add') }}</mat-icon>
            <span>{{ saving() ? 'Saving...' : (isEdit() ? 'Update Customer' : 'Create Customer') }}</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
      .header-content {
        h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px 0;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 0.9rem;
          margin: 0;
        }
      }
    }
    .form-card {
      max-width: 680px;
      padding: 24px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }
    .full-width {
      width: 100%;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);

      .submit-btn {
        min-width: 150px;
      }
    }
  `],
})
export default class CustomerForm implements OnInit, OnDestroy {
  form: FormGroup;
  isEdit = signal(false);
  saving = signal(false);
  private editId = '';
  private gstinSub?: Subscription;

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
      state: [''],
    });
  }

  ngOnInit() {
    // Auto-derive state when GSTIN is typed
    this.gstinSub = this.form.get('gstin')?.valueChanges.subscribe((val) => {
      if (val && typeof val === 'string') {
        const trimmed = val.trim().toUpperCase();
        if (trimmed.length >= 2) {
          const code = trimmed.substring(0, 2);
          const detected = GST_STATE_MAP[code];
          if (detected) {
            const currentState = this.form.get('state')?.value;
            if (!currentState || currentState.trim() === '') {
              this.form.patchValue({ state: detected }, { emitEvent: false });
            }
          }
        }
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.editId = id;
      this.api.findOne(id).subscribe({
        next: (c) => {
          this.form.patchValue({
            name: c.name || '',
            phone: c.phone || '',
            address: c.address || '',
            gstin: c.gstin || '',
            state: c.state || '',
          });
        },
        error: () => {
          this.snackBar.open('Failed to load customer details', 'OK', { duration: 3000 });
          this.router.navigate(['/customers']);
        },
      });
    }
  }

  ngOnDestroy() {
    this.gstinSub?.unsubscribe();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill in required fields correctly', 'OK', { duration: 3000 });
      return;
    }

    this.saving.set(true);
    const formVal = this.form.value;

    // Build sanitized payload with no nulls or empty strings
    interface CustomerPayload {
      name: string;
      phone?: string;
      address?: string;
      gstin?: string;
      state?: string;
    }
    const data: CustomerPayload = {
      name: formVal.name?.trim(),
    };
    if (formVal.phone?.trim()) data.phone = formVal.phone.trim();
    if (formVal.address?.trim()) data.address = formVal.address.trim();
    if (formVal.gstin?.trim()) data.gstin = formVal.gstin.trim().toUpperCase();
    if (formVal.state?.trim()) data.state = formVal.state.trim().toUpperCase();

    const obs = this.isEdit()
      ? this.api.update(this.editId, data)
      : this.api.create(data);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(
          this.isEdit() ? 'Customer updated successfully' : 'Customer created successfully',
          'OK',
          { duration: 3500 },
        );
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
        this.snackBar.open(msg, 'OK', { duration: 4500 });
      },
    });
  }

  cancel() {
    this.router.navigate(['/customers']);
  }
}

