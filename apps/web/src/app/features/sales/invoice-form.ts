import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SalesApiService } from '../../core/api/sales-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';

export interface InvoiceLineItem {
  name: string;
  hsn: string;
  qty: number;
  rate: number;
  total: number;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
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
        <div class="section-box customer-section">
          <div class="section-header">
            <span class="section-title">1. Customer Details</span>
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
                  placeholder="e.g. Ramesh Trading Co. or Harshit Vishwakarma"
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

        <!-- Products / Line Items Section -->
        <div class="section-box items-section">
          <div class="section-header">
            <span class="section-title">2. Products & Services ({{ lineItems().length }} items)</span>
            <button
              type="button"
              mat-flat-button
              color="accent"
              class="add-item-btn"
              (click)="addItem()"
            >
              <mat-icon>add</mat-icon>
              Add Product
            </button>
          </div>

          <div class="items-list">
            @for (item of lineItems(); track $index) {
              <div class="item-row">
                <div class="item-index">{{ $index + 1 }}</div>

                <div class="item-fields">
                  <!-- Product Name -->
                  <mat-form-field appearance="outline" class="product-name-field">
                    <mat-label>Product / Service Name *</mat-label>
                    <input
                      matInput
                      [(ngModel)]="item.name"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="onItemUpdated($index)"
                      placeholder="e.g. Cement 50kg, Steel Rods"
                      required
                    />
                  </mat-form-field>

                  <!-- HSN/SAC -->
                  <mat-form-field appearance="outline" class="hsn-field">
                    <mat-label>HSN / SAC</mat-label>
                    <input
                      matInput
                      [(ngModel)]="item.hsn"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="e.g. 2523"
                    />
                  </mat-form-field>

                  <!-- Quantity -->
                  <mat-form-field appearance="outline" class="qty-field">
                    <mat-label>Qty *</mat-label>
                    <input
                      matInput
                      type="number"
                      min="0.01"
                      step="any"
                      [(ngModel)]="item.qty"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="onItemUpdated($index)"
                      required
                    />
                  </mat-form-field>

                  <!-- Unit Rate -->
                  <mat-form-field appearance="outline" class="rate-field">
                    <mat-label>Rate (₹) *</mat-label>
                    <input
                      matInput
                      type="number"
                      min="0"
                      step="any"
                      [(ngModel)]="item.rate"
                      [ngModelOptions]="{ standalone: true }"
                      (ngModelChange)="onItemUpdated($index)"
                      required
                    />
                    <span matPrefix>₹&nbsp;</span>
                  </mat-form-field>

                  <!-- Line Total -->
                  <div class="line-total-box">
                    <span class="total-label">Total</span>
                    <span class="total-val">₹ {{ item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>

                  <!-- Delete Item Button -->
                  <button
                    type="button"
                    mat-icon-button
                    color="warn"
                    class="remove-btn"
                    [disabled]="lineItems().length <= 1"
                    (click)="removeItem($index)"
                    matTooltip="Remove product"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Add Item Button at bottom of list -->
          <div class="items-footer">
            <button
              type="button"
              mat-stroked-button
              (click)="addItem()"
              class="add-more-btn"
            >
              <mat-icon>add_circle_outline</mat-icon>
              Add Another Product
            </button>

            <!-- Grand Total Bar -->
            <div class="grand-total-card">
              <div class="total-stat">
                <span class="stat-label">Total Items:</span>
                <span class="stat-value">{{ lineItems().length }}</span>
              </div>
              <div class="total-stat">
                <span class="stat-label">Total Qty:</span>
                <span class="stat-value">{{ totalQuantity() }}</span>
              </div>
              <div class="total-stat grand-stat">
                <span class="stat-label">Grand Total:</span>
                <span class="stat-value">₹ {{ grandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Invoice Meta -->
        <div class="section-box">
          <span class="section-title" style="margin-bottom: 12px; display: block;">3. Invoice Details</span>
          <div class="grid-2">
            <mat-form-field appearance="outline">
              <mat-label>Invoice Date</mat-label>
              <input matInput type="date" formControlName="date" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Total Invoice Amount (₹) *</mat-label>
              <input matInput type="number" formControlName="amountRupees" min="0.01" step="0.01" />
              <span matPrefix>₹&nbsp;</span>
              <mat-hint>Calculated automatically from products above</mat-hint>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" style="margin-top: 8px;">
            <mat-label>Description / Overall Notes (Optional)</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="2"
              placeholder="e.g. Terms of delivery, transport details, or payment terms"
            ></textarea>
          </mat-form-field>
        </div>

        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/sales'])">Cancel</button>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || isSubmitting() || !isItemsValid()"
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
      max-width: 860px;
      padding: 24px;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .section-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-indigo);
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
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--text-secondary);
    }
    .active-btn {
      background: #2563eb !important;
      color: #ffffff !important;
      border-color: #3b82f6 !important;
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
      padding: 12px 16px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .customer-preview strong {
      color: var(--text-primary);
    }

    /* Items Section Styling */
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 12px;
      transition: border-color 0.15s ease;
    }
    .item-row:hover {
      border-color: rgba(255, 255, 255, 0.18);
    }
    .item-index {
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-indigo);
      flex-shrink: 0;
    }
    .item-fields {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      flex-wrap: wrap;
    }
    .item-fields mat-form-field {
      margin-bottom: -16px;
    }
    .product-name-field {
      flex: 3;
      min-width: 180px;
    }
    .hsn-field {
      flex: 1.2;
      min-width: 90px;
    }
    .qty-field {
      flex: 1;
      min-width: 75px;
    }
    .rate-field {
      flex: 1.4;
      min-width: 110px;
    }
    .line-total-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      min-width: 110px;
      padding: 0 8px;
    }
    .total-label {
      font-size: 10px;
      color: var(--text-secondary);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .total-val {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-green);
    }
    .remove-btn {
      flex-shrink: 0;
    }
    .items-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .add-more-btn {
      font-size: 13px;
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--text-primary);
    }
    .grand-total-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 18px;
    }
    .total-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .stat-label {
      color: var(--text-secondary);
    }
    .stat-value {
      font-weight: 600;
      color: var(--text-primary);
    }
    .grand-stat .stat-value {
      font-size: 16px;
      font-weight: 800;
      color: var(--accent-indigo);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    mat-icon[matPrefix] {
      color: var(--accent-indigo) !important;
      margin-right: 8px;
    }

    input::placeholder,
    textarea::placeholder {
      color: rgba(255, 255, 255, 0.38) !important;
    }

    @media (max-width: 768px) {
      .item-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      .product-name-field {
        grid-column: span 2;
      }
      .grid-2 {
        grid-template-columns: 1fr;
      }
      .items-footer {
        flex-direction: column;
        align-items: stretch;
      }
      .grand-total-card {
        justify-content: space-between;
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

  // Dynamic Product Line Items
  lineItems = signal<InvoiceLineItem[]>([
    { name: '', hsn: '', qty: 1, rate: 0, total: 0 },
  ]);

  totalQuantity = computed(() => {
    return this.lineItems().reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
  });

  grandTotal = computed(() => {
    return this.lineItems().reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  });

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
      amountRupees: [0, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.customersApi.findAll({ limit: 100 }).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.customers.set(list);
        if (list.length === 0) {
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

  addItem() {
    const items = [...this.lineItems()];
    items.push({ name: '', hsn: '', qty: 1, rate: 0, total: 0 });
    this.lineItems.set(items);
    this.syncTotal();
  }

  removeItem(index: number) {
    if (this.lineItems().length <= 1) return;
    const items = [...this.lineItems()];
    items.splice(index, 1);
    this.lineItems.set(items);
    this.syncTotal();
  }

  onItemUpdated(index: number) {
    const items = [...this.lineItems()];
    const item = items[index];
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    item.total = Math.round(qty * rate * 100) / 100;
    this.lineItems.set(items);
    this.syncTotal();
  }

  private syncTotal() {
    const total = this.grandTotal();
    this.form.patchValue({ amountRupees: total });
  }

  isItemsValid(): boolean {
    const items = this.lineItems();
    if (items.length === 0) return false;
    return items.every(
      (item) => item.name && item.name.trim().length > 0 && item.qty > 0 && item.rate >= 0,
    );
  }

  save() {
    if (this.form.invalid || this.isSubmitting() || !this.isItemsValid()) return;

    this.isSubmitting.set(true);
    const v = this.form.value;

    const itemsPayload = this.lineItems().map((i) => ({
      name: i.name.trim(),
      hsn: i.hsn?.trim() || undefined,
      qty: Number(i.qty),
      rate: Number(i.rate),
      total: Number(i.total),
    }));

    const payload: any = {
      date: v.date,
      amount: Math.round(Number(v.amountRupees) * 100), // convert ₹ to paise
      description: v.description?.trim() || undefined,
      items: itemsPayload,
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
