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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SalesApiService } from '../../core/api/sales-api.service';
import { CustomersApiService } from '../../core/api/customers-api.service';
import { ProductsApiService, Product } from '../../core/api/products-api.service';

export interface InvoiceLineItem {
  productId?: string;
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
    MatAutocompleteModule,
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

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 1. CUSTOMER DETAILS                                   -->
        <!-- ══════════════════════════════════════════════════════ -->
        <div class="section-box customer-section">
          <div class="section-header">
            <span class="section-title">1. Customer Details</span>
            <div class="mode-toggles">
              <button
                type="button"
                class="pill-toggle-btn"
                [class.active-btn]="customerMode() === 'existing'"
                (click)="setCustomerMode('existing')"
              >
                <mat-icon>people</mat-icon>
                Existing Customer
              </button>
              <button
                type="button"
                class="pill-toggle-btn"
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
                      {{ c.name }} {{ c.phone ? '(' + c.phone + ')' : '' }} {{ c.state ? '[' + c.state + ']' : '' }}
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
                    <strong>State (Place of Supply):</strong> {{ selectedCustomer()?.state || 'RAJASTHAN (Default)' }}
                  </div>
                  @if (selectedCustomer()?.gstin) {
                    <div class="preview-item">
                      <strong>GSTIN:</strong> {{ selectedCustomer()?.gstin }}
                    </div>
                  }
                  @if (selectedCustomer()?.address) {
                    <div class="preview-item">
                      <strong>Address:</strong> {{ selectedCustomer()?.address }}
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="new-customer-fields">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Customer Name **</mat-label>
                <input
                  matInput
                  formControlName="customerName"
                  placeholder="e.g. Alnoor Water Solutions / Harshit Vishwakarma"
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
                    placeholder="e.g. 9829012345"
                    maxlength="15"
                  />
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>GSTIN (Optional)</mat-label>
                  <input
                    matInput
                    formControlName="customerGstin"
                    placeholder="e.g. 08ABCDE1234F1Z5"
                    maxlength="15"
                  />
                  <mat-icon matPrefix>receipt_long</mat-icon>
                </mat-form-field>
              </div>

              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>State / Place of Supply (Optional)</mat-label>
                  <input
                    matInput
                    formControlName="customerState"
                    placeholder="e.g. RAJASTHAN, MAHARASHTRA"
                  />
                  <mat-icon matPrefix>map</mat-icon>
                  <mat-hint>Used for CGST+SGST vs IGST calculation</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Billing Address (Optional)</mat-label>
                  <input
                    matInput
                    formControlName="customerAddress"
                    placeholder="e.g. Shop 4, Water Market, Jaipur"
                  />
                  <mat-icon matPrefix>location_on</mat-icon>
                </mat-form-field>
              </div>
            </div>
          }
        </div>

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 2. PRODUCTS & SERVICES                                -->
        <!-- ══════════════════════════════════════════════════════ -->
        <div class="section-box items-section">
          <div class="section-header">
            <span class="section-title">2. Products & Services ({{ lineItems().length }} items)</span>
            <button
              type="button"
              class="add-product-header-btn"
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
                  <!-- Product Name with Catalog Autocomplete -->
                  <mat-form-field appearance="outline" class="product-name-field">
                    <mat-label>Product / Service Name **</mat-label>
                    <input
                      matInput
                      [(ngModel)]="item.name"
                      [ngModelOptions]="{ standalone: true }"
                      [matAutocomplete]="auto"
                      (input)="filterProducts(item.name)"
                      (ngModelChange)="onItemUpdated($index)"
                      placeholder="e.g. INLINE CRUZE SEDIMENT, PRE CARBON"
                      required
                    />
                    <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onProductSelected($index, $event.option.value)">
                      @for (p of filteredProducts(); track p.id) {
                        <mat-option [value]="p">
                          <div class="product-option-row">
                            <span class="p-name">{{ p.name }}</span>
                            <span class="p-rate">₹ {{ (p.rate / 100).toFixed(2) }}</span>
                          </div>
                        </mat-option>
                      }
                    </mat-autocomplete>
                  </mat-form-field>

                  <!-- HSN/SAC -->
                  <mat-form-field appearance="outline" class="hsn-field">
                    <mat-label>HSN / ...</mat-label>
                    <input
                      matInput
                      [(ngModel)]="item.hsn"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="e.g. 8421"
                    />
                  </mat-form-field>

                  <!-- Quantity -->
                  <mat-form-field appearance="outline" class="qty-field">
                    <mat-label>Qty **</mat-label>
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
                    <mat-label>Rate (₹) **</mat-label>
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
                    <span class="total-label">TOTAL</span>
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

          <!-- Add Item Button at bottom of list + Summary Bar -->
          <div class="items-footer">
            <button
              type="button"
              class="add-another-btn"
              (click)="addItem()"
            >
              <mat-icon>add_circle_outline</mat-icon>
              Add Another Product
            </button>

            <!-- Grand Total Bar matching screenshot -->
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
                <span class="stat-label">Subtotal:</span>
                <span class="stat-value badge-total">₹ {{ subtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 3. INVOICE & TAX DETAILS                              -->
        <!-- ══════════════════════════════════════════════════════ -->
        <div class="section-box invoice-details-section">
          <div class="section-header">
            <span class="section-title">3. Invoice Details</span>

            <!-- GST Toggle Buttons -->
            <div class="gst-toggle-group">
              <button
                type="button"
                class="gst-btn"
                [class.active-gst]="!isGstInvoice()"
                (click)="setGst(false)"
              >
                Without GST
              </button>
              <button
                type="button"
                class="gst-btn"
                [class.active-gst]="isGstInvoice()"
                (click)="setGst(true)"
              >
                <mat-icon>verified</mat-icon>
                With GST (Tax Invoice)
              </button>
            </div>
          </div>

          @if (isGstInvoice()) {
            <!-- Tax Configuration & Dynamic Breakdown -->
            <div class="gst-config-box">
              <div class="grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>GST Tax Slab / Rate</mat-label>
                  <mat-select formControlName="taxRate" (selectionChange)="recalculateGrandTotal()">
                    <mat-option [value]="18">18% GST (Standard for RO & Parts)</mat-option>
                    <mat-option [value]="12">12% GST</mat-option>
                    <mat-option [value]="5">5% GST</mat-option>
                    <mat-option [value]="28">28% GST</mat-option>
                    <mat-option [value]="0">0% GST (Nil Rated)</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Other Charges / Freight / Extra (₹)</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="1"
                    formControlName="otherAmountRupees"
                    (input)="recalculateGrandTotal()"
                    placeholder="0.00"
                  />
                  <span matPrefix>₹&nbsp;</span>
                </mat-form-field>
              </div>

              <!-- Live Tax Breakdown Card -->
              <div class="tax-breakdown-card">
                <div class="breakdown-title">
                  <mat-icon>receipt</mat-icon>
                  <span>TAX BREAKUP ({{ isSameState() ? 'INTRA-STATE: CGST + SGST' : 'INTER-STATE: IGST' }})</span>
                </div>
                <div class="breakdown-rows">
                  <div class="b-row">
                    <span>Taxable Subtotal (Goods):</span>
                    <strong>₹ {{ subtotal().toFixed(2) }}</strong>
                  </div>

                  @if (isSameState()) {
                    <div class="b-row">
                      <span>CGST ({{ (form.get('taxRate')?.value / 2) }}%):</span>
                      <strong>₹ {{ cgst().toFixed(2) }}</strong>
                    </div>
                    <div class="b-row">
                      <span>SGST ({{ (form.get('taxRate')?.value / 2) }}%):</span>
                      <strong>₹ {{ sgst().toFixed(2) }}</strong>
                    </div>
                  } @else {
                    <div class="b-row">
                      <span>IGST ({{ form.get('taxRate')?.value }}%):</span>
                      <strong>₹ {{ igst().toFixed(2) }}</strong>
                    </div>
                  }

                  @if (otherAmount() > 0) {
                    <div class="b-row">
                      <span>Other Charges / Freight:</span>
                      <strong>₹ {{ otherAmount().toFixed(2) }}</strong>
                    </div>
                  }

                  <div class="b-row grand-row">
                    <span>Grand Total Due:</span>
                    <strong class="highlight-grand">₹ {{ finalGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <div class="non-gst-box">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Other Charges / Freight / Extra (₹) (Optional)</mat-label>
                <input
                  matInput
                  type="number"
                  min="0"
                  step="1"
                  formControlName="otherAmountRupees"
                  (input)="recalculateGrandTotal()"
                  placeholder="0.00"
                />
                <span matPrefix>₹&nbsp;</span>
              </mat-form-field>
            </div>
          }

          <div class="grid-2" style="margin-top: 10px;">
            <mat-form-field appearance="outline">
              <mat-label>Invoice Date *</mat-label>
              <input matInput type="date" formControlName="date" required />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Total Invoice Amount (₹) **</mat-label>
              <input
                matInput
                type="number"
                [value]="finalGrandTotal()"
                readonly
              />
              <span matPrefix>₹&nbsp;</span>
              <mat-hint>Calculated automatically from items & tax</mat-hint>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width" style="margin-top: 8px;">
            <mat-label>Description / Item Notes (Optional)</mat-label>
            <textarea
              matInput
              formControlName="description"
              rows="2"
              placeholder="e.g. Terms of delivery, transport details, or payment terms"
            ></textarea>
          </mat-form-field>
        </div>

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- ACTIONS                                               -->
        <!-- ══════════════════════════════════════════════════════ -->
        <div class="form-actions">
          <button mat-button type="button" class="cancel-btn" (click)="router.navigate(['/sales'])">Cancel</button>
          <button
            mat-flat-button
            class="submit-btn"
            type="submit"
            [disabled]="form.invalid || isSubmitting() || !isItemsValid()"
          >
            @if (isSubmitting()) {
              <span>Saving Invoice...</span>
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
      max-width: 920px;
      padding: 24px;
      border-radius: 12px;
      background: var(--bg-card, #131722);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .section-box {
      background: var(--bg-secondary, #1a202c);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
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
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Pill buttons for customer mode */
    .mode-toggles {
      display: flex;
      gap: 8px;
    }
    .pill-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-secondary, #94a3b8);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.active-btn {
        background: #0284c7 !important;
        color: #ffffff !important;
        border-color: #38bdf8 !important;
        box-shadow: 0 0 12px rgba(2, 132, 199, 0.4);
      }
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
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);

      strong {
        color: #f1f5f9;
      }
    }

    /* Add Product Header button matching screenshot */
    .add-product-header-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 18px;
      background: #93c5fd;
      color: #0f172a;
      border: none;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: #bfdbfe;
        transform: translateY(-1px);
      }
    }

    /* Line items list */
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 14px;
      transition: border-color 0.15s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
      }
    }
    .item-index {
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #93c5fd;
      flex-shrink: 0;
    }
    .item-fields {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      flex-wrap: wrap;

      mat-form-field {
        margin-bottom: -16px;
      }
    }
    .product-name-field {
      flex: 3;
      min-width: 200px;
    }
    .hsn-field {
      flex: 1.1;
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
      font-size: 9px;
      color: var(--text-secondary, #94a3b8);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .total-val {
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
    }
    .remove-btn {
      flex-shrink: 0;
    }

    .product-option-row {
      display: flex;
      justify-content: space-between;
      width: 100%;
      gap: 16px;

      .p-name {
        font-weight: 500;
      }
      .p-rate {
        color: #38bdf8;
        font-weight: 600;
      }
    }

    /* Items Footer matching screenshot */
    .items-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .add-another-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: #f1f5f9;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    }

    /* Grand Total Card with highlighted blue badge */
    .grand-total-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 16px;
    }
    .total-stat {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .stat-label {
      color: #94a3b8;
    }
    .stat-value {
      font-weight: 700;
      color: #f8fafc;
      font-size: 15px;
    }
    .badge-total {
      background: #1e3a8a;
      border: 1px solid #3b82f6;
      color: #60a5fa !important;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 800;
    }

    /* GST Toggle Buttons */
    .gst-toggle-group {
      display: flex;
      gap: 8px;
    }
    .gst-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.active-gst {
        background: #0284c7 !important;
        color: #ffffff !important;
        border-color: #38bdf8 !important;
        box-shadow: 0 0 10px rgba(2, 132, 199, 0.3);
      }
    }

    /* Tax Breakdown Box */
    .gst-config-box {
      background: rgba(2, 132, 199, 0.06);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .tax-breakdown-card {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 14px;
      margin-top: 10px;
    }
    .breakdown-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 6px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
    .breakdown-rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .b-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #cbd5e1;

      &.grand-row {
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px dashed rgba(255, 255, 255, 0.15);
        font-size: 15px;
        font-weight: 700;
      }
    }
    .highlight-grand {
      color: #38bdf8;
      font-size: 18px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }
    .cancel-btn {
      color: #94a3b8;
    }
    .submit-btn {
      background: #0284c7 !important;
      color: #ffffff !important;
      padding: 0 24px;
      font-weight: 700;

      &:hover {
        background: #0369a1 !important;
      }
    }

    mat-icon[matPrefix] {
      color: #38bdf8 !important;
      margin-right: 8px;
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
  allProducts = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  customerMode = signal<'existing' | 'new'>('existing');
  selectedCustomer = signal<any | null>(null);
  isSubmitting = signal<boolean>(false);
  isGstInvoice = signal<boolean>(false);

  // Dynamic Product Line Items
  lineItems = signal<InvoiceLineItem[]>([
    { name: '', hsn: '', qty: 1, rate: 0, total: 0 },
  ]);

  totalQuantity = computed(() => {
    return this.lineItems().reduce((acc, item) => acc + (Number(item.qty) || 0), 0);
  });

  subtotal = computed(() => {
    return this.lineItems().reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  });

  otherAmount = computed(() => {
    return Number(this.form?.get('otherAmountRupees')?.value) || 0;
  });

  isSameState = computed(() => {
    const customerState = (
      this.customerMode() === 'existing'
        ? this.selectedCustomer()?.state
        : this.form?.get('customerState')?.value
    )?.trim().toUpperCase() || 'RAJASTHAN';
    const businessState = 'RAJASTHAN';
    return customerState === businessState;
  });

  totalTax = computed(() => {
    if (!this.isGstInvoice()) return 0;
    const rate = Number(this.form?.get('taxRate')?.value) || 0;
    return Math.round(this.subtotal() * rate) / 100;
  });

  cgst = computed(() => {
    if (!this.isGstInvoice() || !this.isSameState()) return 0;
    return Math.round((this.totalTax() / 2) * 100) / 100;
  });

  sgst = computed(() => {
    if (!this.isGstInvoice() || !this.isSameState()) return 0;
    return Math.round((this.totalTax() - this.cgst()) * 100) / 100;
  });

  igst = computed(() => {
    if (!this.isGstInvoice() || this.isSameState()) return 0;
    return this.totalTax();
  });

  finalGrandTotal = computed(() => {
    const goods = this.subtotal();
    const tax = this.totalTax();
    const other = this.otherAmount();
    return Math.round((goods + tax + other) * 100) / 100;
  });

  constructor(
    private fb: FormBuilder,
    private salesApi: SalesApiService,
    private customersApi: CustomersApiService,
    private productsApi: ProductsApiService,
    public router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      // Existing customer
      customerId: [''],
      // New customer fields
      customerName: [''],
      customerPhone: [''],
      customerGstin: [''],
      customerState: ['RAJASTHAN'],
      customerAddress: [''],
      // GST & Taxes
      isGstInvoice: [false],
      taxRate: [18],
      otherAmountRupees: [0],
      // Invoice details
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
    });
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadProducts();
  }

  private loadCustomers() {
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
      error: () => this.setCustomerMode('new'),
    });
  }

  private loadProducts() {
    this.productsApi.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        const list = res?.data || [];
        this.allProducts.set(list);
        this.filteredProducts.set(list.slice(0, 10));
      },
    });
  }

  filterProducts(query: string) {
    if (!query || !query.trim()) {
      this.filteredProducts.set(this.allProducts().slice(0, 10));
      return;
    }
    const q = query.toLowerCase();
    const matches = this.allProducts().filter(
      (p) => p.name.toLowerCase().includes(q) || (p.hsn && p.hsn.includes(q)),
    );
    this.filteredProducts.set(matches.slice(0, 15));
  }

  onProductSelected(index: number, product: Product) {
    const items = [...this.lineItems()];
    items[index] = {
      ...items[index],
      productId: product.id,
      name: product.name,
      hsn: product.hsn || '',
      rate: product.rate / 100, // convert paise to rupees
      total: Math.round(items[index].qty * (product.rate / 100) * 100) / 100,
    };
    this.lineItems.set(items);
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

  setGst(isGst: boolean) {
    this.isGstInvoice.set(isGst);
    this.form.patchValue({ isGstInvoice: isGst });
    if (!isGst) {
      this.form.patchValue({ taxRate: 0 });
    } else {
      this.form.patchValue({ taxRate: 18 });
    }
  }

  recalculateGrandTotal() {
    // computed signals update automatically
  }

  addItem() {
    const items = [...this.lineItems()];
    items.push({ name: '', hsn: '', qty: 1, rate: 0, total: 0 });
    this.lineItems.set(items);
  }

  removeItem(index: number) {
    if (this.lineItems().length <= 1) return;
    const items = [...this.lineItems()];
    items.splice(index, 1);
    this.lineItems.set(items);
  }

  onItemUpdated(index: number) {
    const items = [...this.lineItems()];
    const item = items[index];
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    item.total = Math.round(qty * rate * 100) / 100;
    this.lineItems.set(items);
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
      productId: i.productId || undefined,
      name: i.name.trim(),
      hsn: i.hsn?.trim() || undefined,
      qty: Number(i.qty),
      rate: Number(i.rate),
      total: Number(i.total),
    }));

    const isGst = this.isGstInvoice();
    const otherPaise = Math.round((Number(v.otherAmountRupees) || 0) * 100);

    const payload: any = {
      date: v.date,
      isGstInvoice: isGst,
      taxRate: isGst ? Number(v.taxRate) || 18 : 0,
      otherAmount: otherPaise,
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
      payload.customerState = v.customerState?.trim() || 'RAJASTHAN';
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
