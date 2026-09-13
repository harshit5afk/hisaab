import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { PurchasesApiService } from '../../core/api/purchases-api.service';
import { ProductsApiService, Product } from '../../core/api/products-api.service';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatIconModule,
    AsyncPipe,
    DecimalPipe,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>New Purchase</h1>
        <p class="subtitle">Record raw material, supplier invoice or stock addition</p>
      </div>
    </div>

    <div class="card form-card">
      <form [formGroup]="form" (ngSubmit)="save()">

        <!-- Product Name — type freely, picks existing or creates new -->
        <mat-form-field appearance="outline">
          <mat-label>Product / Item Name *</mat-label>
          <mat-icon matPrefix>inventory_2</mat-icon>
          <input
            matInput
            [formControl]="productSearch"
            [matAutocomplete]="autoProduct"
            placeholder="e.g. Pre Carbon Filter, RO Pump, Housing..."
            required
          />
          <mat-autocomplete
            #autoProduct="matAutocomplete"
            [displayWith]="displayProduct"
            (optionSelected)="onProductSelected($event.option.value)"
          >
            @for (product of filteredProducts$ | async; track product.id) {
              <mat-option [value]="product">
                <div class="product-option">
                  <span class="product-name">{{ product.name }}</span>
                  <span class="product-meta">
                    {{ product.unit }} &bull; ₹{{ (product.rate / 100) | number:'1.0-2' }} &bull; Stock: {{ product.stock }}
                  </span>
                </div>
              </mat-option>
            }
          </mat-autocomplete>
          @if (selectedProduct) {
            <mat-hint>
              <span class="existing-hint">✓ Linked to existing catalog product — stock & rates will update</span>
            </mat-hint>
          } @else if (productSearchValue) {
            <mat-hint>
              <span class="new-hint">⚡ New product "{{ productSearchValue }}" will be automatically created</span>
            </mat-hint>
          }
        </mat-form-field>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Bill No. (Optional)</mat-label>
            <input matInput formControlName="billNo" placeholder="e.g. INV-1024" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Vendor / Supplier (Optional)</mat-label>
            <mat-icon matPrefix>store</mat-icon>
            <input matInput formControlName="vendor" placeholder="Supplier or Shop Name" />
          </mat-form-field>
        </div>

        <div class="row-fields">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Date *</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
        </div>

        <!-- Quantity, Unit, Rate & Total Amount aligned together in natural calculation order -->
        <div class="row-fields">
          <mat-form-field appearance="outline" style="width: 120px;">
            <mat-label>Quantity *</mat-label>
            <input
              matInput
              type="number"
              formControlName="quantity"
              (input)="onQtyOrRateChange()"
              min="0.01"
              step="any"
              placeholder="1"
            />
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 90px;">
            <mat-label>Unit</mat-label>
            <input matInput formControlName="unit" placeholder="NOS, PCS" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Rate / Unit (₹)</mat-label>
            <input
              matInput
              type="number"
              formControlName="rateRupees"
              (input)="onQtyOrRateChange()"
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
            <span matPrefix>₹&nbsp;</span>
            <mat-hint>Cost per unit</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Total Amount (₹) *</mat-label>
            <input
              matInput
              type="number"
              formControlName="amountRupees"
              (input)="onTotalAmountChange()"
              min="0.01"
              step="0.01"
              placeholder="0.00"
            />
            <span matPrefix>₹&nbsp;</span>
            <mat-hint>Qty &times; Rate</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Description / Notes</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="3"
            placeholder="Items purchased, batch no., warranty or payment details"
          ></textarea>
        </mat-form-field>

        <div class="form-actions">
          <button mat-button type="button" (click)="router.navigate(['/purchases'])">Cancel</button>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || !productSearchValue"
          >
            Save Purchase
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 20px;
      h1 { margin: 0; }
    }
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }
    .form-card { max-width: 680px; }
    form { display: flex; flex-direction: column; gap: 4px; }
    .row-fields { display: flex; gap: 12px; flex-wrap: wrap; }
    .flex-1 { flex: 1; min-width: 140px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; }

    .product-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 12px;
    }
    .product-name { font-weight: 500; }
    .product-meta {
      font-size: 0.78rem;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .existing-hint {
      color: var(--accent-green, #4ade80);
      font-size: 0.78rem;
      font-weight: 500;
    }
    .new-hint {
      color: #8ab4f8;
      font-size: 0.78rem;
      font-weight: 500;
    }
  `],
})
export default class PurchaseForm implements OnInit {
  form: FormGroup;
  productSearch = new FormControl<string | Product | null>('');
  selectedProduct: Product | null = null;
  filteredProducts$!: Observable<Product[]>;

  get productSearchValue(): string {
    const val = this.productSearch.value;
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    return (val as any).name || '';
  }

  constructor(
    private fb: FormBuilder,
    private api: PurchasesApiService,
    private productsApi: ProductsApiService,
    public router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      billNo: [''],
      vendor: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.001)]],
      rateRupees: [null, [Validators.min(0.01)]],
      unit: ['NOS'],
      amountRupees: [null, [Validators.required, Validators.min(0.01)]],
      description: [''],
    });
  }

  ngOnInit() {
    this.filteredProducts$ = this.productSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => {
        const searchStr = typeof query === 'string' ? query : '';
        if (!searchStr.trim()) return of([]);
        return this.productsApi.findAll({ search: searchStr, limit: 10 }).pipe(
          map((r) => r.data),
        );
      }),
    );

    this.route.queryParams.subscribe((params) => {
      if (params['productId']) {
        this.productsApi.findOne(params['productId']).subscribe({
          next: (prod) => {
            this.productSearch.setValue(prod);
            this.onProductSelected(prod);
          },
        });
      }
      if (params['vendor']) this.form.patchValue({ vendor: params['vendor'] });
      if (params['billNo']) this.form.patchValue({ billNo: params['billNo'] });
      if (params['date']) this.form.patchValue({ date: params['date'] });
      if (params['rate']) {
        this.form.patchValue({ rateRupees: Number(params['rate']) });
        this.onQtyOrRateChange();
      }
      if (params['amount']) this.form.patchValue({ amountRupees: Number(params['amount']) });
      if (params['quantity']) {
        this.form.patchValue({ quantity: Number(params['quantity']) });
        this.onQtyOrRateChange();
      }
      if (params['unit']) this.form.patchValue({ unit: params['unit'] });
    });
  }

  displayProduct(product: Product | string | null): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.name;
  }

  onProductSelected(product: Product) {
    this.selectedProduct = product;
    if (product.unit) {
      this.form.patchValue({ unit: product.unit });
    }

    // Autofill purchase rate if not already entered
    let purchaseRate = 0;
    if (product.purchases && product.purchases.length > 0) {
      const lastP = product.purchases[0];
      purchaseRate = (lastP.rate || (lastP.amount / (lastP.quantity || 1))) / 100;
    } else if (product.rate) {
      purchaseRate = product.rate / 100;
    }

    if (purchaseRate > 0 && !this.form.get('rateRupees')?.value) {
      this.form.patchValue({ rateRupees: Number(purchaseRate.toFixed(2)) });
      this.onQtyOrRateChange();
    }
  }

  onQtyOrRateChange() {
    const qty = Number(this.form.get('quantity')?.value);
    const rate = Number(this.form.get('rateRupees')?.value);
    if (qty > 0 && rate > 0 && !isNaN(rate)) {
      const total = Math.round(qty * rate * 100) / 100;
      this.form.patchValue({ amountRupees: total }, { emitEvent: false });
    }
  }

  onTotalAmountChange() {
    const qty = Number(this.form.get('quantity')?.value);
    const total = Number(this.form.get('amountRupees')?.value);
    if (qty > 0 && total > 0 && !isNaN(total)) {
      const rate = Math.round((total / qty) * 100) / 100;
      this.form.patchValue({ rateRupees: rate }, { emitEvent: false });
    }
  }

  save() {
    const v = this.form.value;
    const qty = v.quantity !== null && v.quantity !== '' ? Number(v.quantity) : 1;
    const totalAmountPaise = Math.round(Number(v.amountRupees) * 100);
    const ratePaise = v.rateRupees
      ? Math.round(Number(v.rateRupees) * 100)
      : (qty > 0 ? Math.round(totalAmountPaise / qty) : totalAmountPaise);

    const payload: any = {
      date: v.date,
      quantity: qty,
      rate: ratePaise,
      unit: v.unit?.trim() || 'NOS',
      amount: totalAmountPaise,
    };
    if (v.billNo) payload.billNo = v.billNo;
    if (v.vendor) payload.vendor = v.vendor;
    if (v.description) payload.description = v.description;

    // If user selected an existing product, send productId
    // If user typed a new name, send productName — backend will auto-create
    if (this.selectedProduct) {
      payload.productId = this.selectedProduct.id;
    } else if (this.productSearchValue) {
      payload.productName = this.productSearchValue;
    }

    this.api.create(payload).subscribe({
      next: () => {
        const productLabel = this.selectedProduct?.name || this.productSearchValue;
        this.snackBar.open(
          `✅ "${productLabel}" purchased at ₹${(ratePaise / 100).toFixed(2)}/unit! Stock updated.`,
          'OK',
          { duration: 4000 },
        );
        this.router.navigate(['/purchases']);
      },
      error: () => this.snackBar.open('Failed to save purchase', 'OK', { duration: 3000 }),
    });
  }
}
