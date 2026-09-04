import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { AiApiService } from '../../core/api/ai-api.service';

@Component({
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page-header"><h1>AI Invoice Scanner</h1></div>

    <div class="scanner-layout">
      <div class="card upload-zone" (dragover)="$event.preventDefault()" (drop)="onDrop($event)" (click)="fileInput.click()">
        <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" hidden />

        @if (!preview()) {
          <div class="upload-placeholder">
            <mat-icon>cloud_upload</mat-icon>
            <h3>Drop a bill/invoice photo here</h3>
            <p>or click to browse</p>
          </div>
        } @else {
          <img [src]="preview()" alt="Uploaded bill" class="preview-image" />
        }
      </div>

      <div class="card result-panel">
        @if (loading()) {
          <div class="loading-state">
            <mat-spinner diameter="40" />
            <p>Analyzing invoice with AI...</p>
          </div>
        } @else if (result()) {
          <h3>Extracted Data</h3>
          <div class="result-grid">
            <div class="result-row"><span class="label">Vendor</span><span class="value">{{ result()?.vendor || '—' }}</span></div>
            <div class="result-row"><span class="label">Bill No.</span><span class="value">{{ result()?.billNo || '—' }}</span></div>
            <div class="result-row"><span class="label">Date</span><span class="value">{{ result()?.date || '—' }}</span></div>
            <div class="result-row"><span class="label">Amount</span><span class="value amount">₹{{ result()?.amount || 0 }}</span></div>
            <div class="result-row"><span class="label">Confidence</span>
              <span class="badge" [class.badge-paid]="result()?.confidence === 'high'" [class.badge-draft]="result()?.confidence === 'medium'" [class.badge-overdue]="result()?.confidence === 'low'">
                {{ result()?.confidence }}
              </span>
            </div>
          </div>

          @if (result()?.items?.length) {
            <h4>Items</h4>
            <div class="items-list">
              @for (item of result()?.items; track $index) {
                <div class="item-row">
                  <span>{{ item.description }}</span>
                  <span>{{ item.qty }} × ₹{{ item.rate }} = ₹{{ item.amount }}</span>
                </div>
              }
            </div>
          }

          <div class="result-actions">
            <button mat-flat-button color="primary" (click)="savePurchase()">
              <mat-icon>save</mat-icon> Save as Purchase
            </button>
            <button mat-stroked-button (click)="reset()">Scan Another</button>
          </div>
        } @else {
          <div class="empty-state">
            <mat-icon>document_scanner</mat-icon>
            <p>Upload a bill photo to auto-extract data</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .scanner-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; @media (max-width: 768px) { grid-template-columns: 1fr; } }
    .upload-zone { cursor: pointer; min-height: 300px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color); transition: border-color var(--transition-fast); &:hover { border-color: var(--accent-indigo); } }
    .upload-placeholder { text-align: center; color: var(--text-muted); mat-icon { font-size: 64px; width: 64px; height: 64px; } h3 { margin-top: 16px; } p { margin-top: 4px; font-size: 0.9rem; } }
    .preview-image { max-width: 100%; max-height: 400px; border-radius: var(--radius-sm); }
    .loading-state { text-align: center; padding: 48px 0; p { margin-top: 16px; color: var(--text-secondary); } }
    .result-grid { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
    .result-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
    .label { color: var(--text-secondary); }
    .value { font-weight: 600; }
    .value.amount { color: var(--accent-green); font-size: 1.1rem; }
    .items-list { margin: 8px 0 16px; }
    .item-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; color: var(--text-secondary); }
    .result-actions { display: flex; gap: 12px; margin-top: 20px; }
    .empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); mat-icon { font-size: 48px; width: 48px; height: 48px; } }
  `],
})
export default class InvoiceScanner {
  preview = signal<string | null>(null);
  loading = signal(false);
  result = signal<any>(null);
  private selectedFile: File | null = null;

  constructor(private aiApi: AiApiService, private router: Router, private snackBar: MatSnackBar) {}

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File) {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(file);

    this.loading.set(true);
    this.result.set(null);

    this.aiApi.extractInvoice(file).subscribe({
      next: (data) => { this.result.set(data); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('AI extraction failed. Please enter data manually.', 'OK', { duration: 5000 });
      },
    });
  }

  savePurchase() {
    const r = this.result();
    if (r) {
      // Navigate to purchase form with pre-filled data via query params
      this.router.navigate(['/purchases/new'], {
        queryParams: { vendor: r.vendor, billNo: r.billNo, date: r.date, amount: r.amount },
      });
    }
  }

  reset() {
    this.preview.set(null);
    this.result.set(null);
    this.selectedFile = null;
  }
}
