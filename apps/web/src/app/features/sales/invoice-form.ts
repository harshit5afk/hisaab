import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SalesApiService } from '../../core/api/sales-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-header">
      <div class="header-left">
        <button mat-icon-button (click)="router.navigate(['/sales'])" title="Back to sales">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>New Invoice</h1>
      </div>
    </div>

    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <!-- Customer Selection / Creation Toggle -->
        <div class="customer-section">
          <div class="section-header">
            <span class="section-title">Customer Details</span>
            <div class="mode-toggles">
              <button
                type="button"
                mat-stroked-button
                [class.active-btn]="customerMode() === 'existing'"
                (click)="setCustomerMode('existing')"
              >
                <mat-icon>people</mat-icon>
                Existing Customer
              </button>
              <button
                type="button"
                mat-stroked-button
                [class.active-btn]="customerMode() === 'new'"
                (click)="setCustomerMode('new')"
              >
                <mat-icon>person_add</mat-icon>
                + New Customer
              </button>
            </div>
          </div>

          @if (customerMode() === 'existing') {
            <div class="existing-customer-picker">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Customer</mat-label>
                <mat-select formControlName="customerId" (selectionChange)="onCustomerSelected($event.value)">
                  @for (c of customers(); track c.id) {
                    <mat-option [value]="c.id">
                      {{ c.name }} {{ c.phone ? '(' + c.phone + ')' : '' }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>Choose from your saved customer list</mat-hint>
              </mat-form-field>

              @if (selectedCustomer()) {
                <div class="customer-preview">
                  <div class="preview-item">
                    <strong>Phone:</strong> {{ selectedCustomer()?.phone || '—' }}
                  </div>
                  <div class="preview-item">
                    <strong>Address:</strong> {{ selectedCustomer()?.address || '—' }}
                  </div>
                  @if (selectedCustomer()?.gstin) {
                    <div class="preview-item">
                      <strong>GSTIN:</strong> {{ selectedCustomer()?.gstin }}
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="new-customer-fields">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Customer Name *</mat-label>
                <input
                  matInput
                  formControlName="customerName"
                  placeholder="e.g. Ramesh Trading Co. or Priya Textiles"
                  required
                />
                <mat-icon matPrefix>business</mat-icon>
                @if (form.get('customerName')?.hasError('required') && form.get('customerName')?.touched) {
                  <mat-error>Customer name is required</mat-error>
                }
              </mat-form-field>

              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Phone Number (Optional)</mat-label>
                  <input
                    matInput
                    formControlName="customerPhone"
                    placeholder="e.g. 9876543210"
                    maxlength="15"
                  />
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>GSTIN (Optional)</mat-label>
                  <input
                    matInput
                    formControlName="customerGstin"
                    placeholder="e.g. 27AAAPA1234A1Z5"
                    maxlength="15"
                  />
                  <mat-icon matPrefix>receipt_long</mat-icon>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Billing Address (Optional)</mat-label>
                <input
                  matInput
                  formControlName="customerAddress"
                  placeholder="e.g. Shop 12, MG Road, Pune, Maharashtra"
                />
                <mat-icon matPrefix>location_on</mat-icon>
              </mat-form-field>
            </div>
          }
        </div>

        <div class="divider"></div>

        <!-- Invoice Details -->
        <div class="grid-2">
          <mat-form-field appearance="outline">
            <mat-label>Invoice Date</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Total Amount (₹) *</mat-label>
            <input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" />
            <span matPrefix>₹&nbsp;</span>
            @if (form.get('amountRupees')?.hasError('required') && form.get('amountRupees')?.touched) {
              <mat-error>Amount is required</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description / Item Notes</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            placeholder="e.g. 10 Bags of Cement @ ₹350, Transport charges included"
          ></textarea>
        </mat-form-field>

        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/sales'])">Cancel</button>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || isSubmitting()"
          >
            @if (isSubmitting()) {
              <span>Saving...</span>
            } @else {
              <span>Create Invoice</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 20px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-left h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }
    .form-card {
      max-width: 680px;
      padding: 24px;
      border-radius: 12px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .customer-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mode-toggles {
      display: flex;
      gap: 8px;
    }
    .mode-toggles button {
      font-size: 12px;
      height: 34px;
      line-height: 32px;
      padding: 0 12px;
    }
    .active-btn {
      background: #0284c7 !important;
      color: #ffffff !important;
      border-color: #0284c7 !important;
    }
    .full-width {
      width: 100%;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .customer-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 10px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
    }
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 6px 0;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 12px;
    }
    @media (max-width: 600px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export default class InvoiceForm implements OnInit {
  form: FormGroup;
  customers = signal<any[]>([]);
  customerMode = signal<'existing' | 'new'>('existing');
  selectedCustomer = signal<any | null>(null);
  isSubmitting = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private salesApi: SalesApiService,
    private customersApi: CustomersApiService,
    public router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      // Existing customer
      customerId: [''],
      // New customer fields
      customerName: [''],
      customerPhone: [''],
      customerAddress: [''],
      customerGstin: [''],
      // Invoice details
      date: [new Date().toISOString().split('T')[0], Validators.required],
      amountRupees: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.customersApi.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.customers.set(list);
        if (list.length === 0) {
          // If no customers exist yet, switch directly to "New Customer" mode
          this.setCustomerMode('new');
        } else {
          this.setCustomerMode('existing');
        }
      },
      error: () => {
        this.setCustomerMode('new');
      },
    });
  }

  setCustomerMode(mode: 'existing' | 'new') {
    this.customerMode.set(mode);
    if (mode === 'existing') {
      this.form.get('customerId')?.setValidators([Validators.required]);
      this.form.get('customerName')?.clearValidators();
      this.form.get('customerName')?.setValue('');
    } else {
      this.form.get('customerId')?.clearValidators();
      this.form.get('customerId')?.setValue('');
      this.form.get('customerName')?.setValidators([Validators.required]);
      this.selectedCustomer.set(null);
    }
    this.form.get('customerId')?.updateValueAndValidity();
    this.form.get('customerName')?.updateValueAndValidity();
  }

  onCustomerSelected(customerId: string) {
    const found = this.customers().find((c) => c.id === customerId);
    this.selectedCustomer.set(found || null);
  }

  save() {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const v = this.form.value;

    const payload: any = {
      date: v.date,
      amount: Math.round(Number(v.amountRupees) * 100), // convert ₹ to paise
      description: v.description || undefined,
    };

    if (this.customerMode() === 'existing') {
      payload.customerId = v.customerId;
    } else {
      payload.customerName = v.customerName?.trim();
      payload.customerPhone = v.customerPhone?.trim() || undefined;
      payload.customerAddress = v.customerAddress?.trim() || undefined;
      payload.customerGstin = v.customerGstin?.trim() || undefined;
    }

    this.salesApi.create(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.snackBar.open('Invoice created successfully!', 'OK', { duration: 3000 });
        this.router.navigate(['/sales']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMsg = err.error?.message || 'Failed to create invoice';
        this.snackBar.open(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg, 'OK', {
          duration: 4000,
        });
      },
    });
  }
}
