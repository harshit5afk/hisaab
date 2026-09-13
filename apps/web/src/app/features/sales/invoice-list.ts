import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PaiseToRupeesPipe } from '../../shared/pipes/paise-to-rupees.pipe';
import { SalesApiService } from '../../core/api/sales-api.service';

@Component({
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    PaiseToRupeesPipe,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Sales / Invoices ({{ invoices().length }})</h1>
        <p class="subtitle">Click any invoice row to preview and download PDF</p>
      </div>
      <a mat-flat-button color="primary" routerLink="/sales/new">
        <mat-icon>add</mat-icon> New Invoice
      </a>
    </div>

    <!-- Bulk Action Bar -->
    @if (selectedIds().size > 0) {
      <div class="bulk-action-bar">
        <div class="bulk-info">
          <span class="bulk-count">{{ selectedIds().size }}</span>
          <span>invoice{{ selectedIds().size > 1 ? 's' : '' }} selected</span>
        </div>
        <div class="bulk-buttons">
          <button mat-button (click)="clearSelection()">Clear Selection</button>
          <button mat-flat-button color="warn" (click)="openBulkDeleteModal()">
            <mat-icon>delete</mat-icon> Delete Selected ({{ selectedIds().size }})
          </button>
        </div>
      </div>
    }

    <div class="card table-card">
      <table mat-table [dataSource]="invoices()" class="full-width">
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef class="select-col">
            <mat-checkbox
              [checked]="isAllSelected()"
              [indeterminate]="isSomeSelected()"
              (change)="toggleSelectAll()"
              color="primary"
            ></mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let i" class="select-col" (click)="$event.stopPropagation()">
            <mat-checkbox
              [checked]="selectedIds().has(i.id)"
              (change)="toggleSelect(i.id)"
              color="primary"
            ></mat-checkbox>
          </td>
        </ng-container>

        <ng-container matColumnDef="invoiceNo">
          <th mat-header-cell *matHeaderCellDef>Invoice #</th>
          <td mat-cell *matCellDef="let i">
            <span class="invoice-no">{{ i.invoiceNo }}</span>
            @if (i.isGstInvoice) {
              <span class="gst-badge">TAX INVOICE</span>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="customer">
          <th mat-header-cell *matHeaderCellDef>Customer</th>
          <td mat-cell *matCellDef="let i">{{ i.customer?.name || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef>Date</th>
          <td mat-cell *matCellDef="let i">{{ i.date | date:'dd MMM yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Total Due</th>
          <td mat-cell *matCellDef="let i" class="amount-cell">
            <div>{{ (i.totalAmount || i.amount) | paiseToRupees }}</div>
            @if (i.isGstInvoice && (i.cgst > 0 || i.sgst > 0 || i.igst > 0)) {
              <div class="tax-subtext">Tax: ₹{{ ((i.cgst + i.sgst + i.igst) / 100).toFixed(2) }}</div>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let i">
            <span class="badge" [class]="'badge-' + i.status.toLowerCase()">{{ i.status }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let i" class="action-cell" (click)="$event.stopPropagation()">
            <button mat-icon-button matTooltip="Preview Invoice" (click)="openPreview(i)">
              <mat-icon>visibility</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Download PDF" (click)="downloadInvoice(i.id)">
              <mat-icon>picture_as_pdf</mat-icon>
            </button>
            <button mat-icon-button color="warn" matTooltip="Delete invoice" (click)="openDeleteModal(i)">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: displayedColumns;"
          class="clickable-row"
          (click)="openPreview(row)"
          matTooltip="Click to preview invoice"
        ></tr>
      </table>

      @if (invoices().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <p>No invoices created yet. Click "New Invoice" to create one!</p>
        </div>
      }
    </div>

    <!-- ── Invoice Full Preview Modal ── -->
    @if (previewInvoice()) {
      <div class="modal-backdrop" (click)="closePreview()">
        <div class="modal-card preview-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header preview-header">
            <div class="header-left">
              <div class="invoice-icon-bubble">
                <mat-icon>receipt</mat-icon>
              </div>
              <div>
                <div class="title-with-badge">
                  <h2>{{ previewInvoice()?.invoiceNo }}</h2>
                  <span class="badge" [class]="'badge-' + previewInvoice()?.status?.toLowerCase()">{{ previewInvoice()?.status }}</span>
                  @if (previewInvoice()?.isGstInvoice) {
                    <span class="gst-badge">TAX INVOICE</span>
                  }
                </div>
                <p class="preview-subtext">
                  Customer: <strong>{{ previewInvoice()?.customer?.name || '—' }}</strong> &bull; Date: {{ previewInvoice()?.date | date:'dd MMM yyyy' }}
                </p>
              </div>
            </div>

            <div class="header-right-actions">
              <button
                mat-flat-button
                color="primary"
                class="download-btn"
                (click)="downloadInvoice(previewInvoice()!.id)"
                [disabled]="isPdfDownloading()"
              >
                <mat-icon>file_download</mat-icon>
                <span>{{ isPdfDownloading() ? 'Downloading...' : 'Download PDF' }}</span>
              </button>
              <button mat-icon-button (click)="closePreview()" class="close-btn" matTooltip="Close Preview">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div class="modal-body preview-body">
            @if (isPdfLoading()) {
              <div class="preview-loading-state">
                <div class="spinner-bubble">
                  <mat-icon class="spinning">autorenew</mat-icon>
                </div>
                <p class="loading-title">Generating Invoice Preview...</p>
                <p class="loading-subtitle">Preparing high-resolution document</p>
              </div>
            } @else if (pdfBlobUrl()) {
              <div class="pdf-container">
                <iframe [src]="pdfBlobUrl()" class="pdf-iframe" title="Invoice PDF Preview"></iframe>
              </div>
            } @else {
              <div class="preview-error-state">
                <mat-icon class="warn-icon">error_outline</mat-icon>
                <p class="loading-title">Could not generate PDF preview</p>
                <p class="loading-subtitle">You can still try downloading the invoice PDF directly.</p>
                <button mat-stroked-button color="primary" (click)="downloadInvoice(previewInvoice()!.id)">
                  <mat-icon>file_download</mat-icon> Try Download
                </button>
              </div>
            }
          </div>

          <div class="modal-footer preview-footer">
            <div class="footer-amount-summary">
              <span class="total-label">Total Amount:</span>
              <span class="total-val">{{ (previewInvoice()?.totalAmount || previewInvoice()?.amount) | paiseToRupees }}</span>
            </div>
            <div class="footer-actions">
              <button mat-button (click)="closePreview()">Close</button>
              <button
                mat-flat-button
                color="primary"
                (click)="downloadInvoice(previewInvoice()!.id)"
                [disabled]="isPdfDownloading()"
              >
                <mat-icon>file_download</mat-icon>
                <span>{{ isPdfDownloading() ? 'Downloading...' : 'Download PDF' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ── Single Delete Confirmation Modal ── -->
    @if (invoiceToDelete()) {
      <div class="modal-backdrop" (click)="closeDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Delete Invoice?</h2>
            </div>
            <button mat-icon-button (click)="closeDeleteModal()" class="close-btn" [disabled]="isDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to delete invoice <strong>{{ invoiceToDelete()?.invoiceNo }}</strong>?
            </p>
            <p class="delete-submsg">
              Stock will be automatically reverted for items in this invoice.
            </p>
          </div>

          <div class="modal-footer">
            <button mat-button type="button" (click)="closeDeleteModal()" [disabled]="isDeleting()">
              Cancel
            </button>
            <button
              mat-flat-button
              color="warn"
              (click)="executeDelete()"
              [disabled]="isDeleting()"
              class="confirm-delete-btn"
            >
              <mat-icon>delete</mat-icon>
              <span>{{ isDeleting() ? 'Deleting...' : 'Yes, Delete' }}</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Bulk Delete Confirmation Modal ── -->
    @if (showBulkDeleteModal()) {
      <div class="modal-backdrop" (click)="closeBulkDeleteModal()">
        <div class="modal-card delete-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header delete-header">
            <div class="header-info">
              <div class="warn-icon-bubble">
                <mat-icon>warning</mat-icon>
              </div>
              <h2>Delete Selected Invoices?</h2>
            </div>
            <button mat-icon-button (click)="closeBulkDeleteModal()" class="close-btn" [disabled]="isBulkDeleting()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="modal-body">
            <p class="delete-msg">
              Are you sure you want to delete <strong>{{ selectedIds().size }} selected invoice{{ selectedIds().size > 1 ? 's' : '' }}</strong>?
            </p>
            <p class="delete-submsg">
              Stock will be automatically reverted for items in these invoices. This action cannot be undone.
            </p>
          </div>

          <div class="modal-footer">
            <button mat-button type="button" (click)="closeBulkDeleteModal()" [disabled]="isBulkDeleting()">
              Cancel
            </button>
            <button
              mat-flat-button
              color="warn"
              (click)="executeBulkDelete()"
              [disabled]="isBulkDeleting()"
              class="confirm-delete-btn"
            >
              <mat-icon>delete</mat-icon>
              <span>{{ isBulkDeleting() ? 'Deleting...' : 'Yes, Delete (' + selectedIds().size + ')' }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }
    .table-card {
      padding: 0;
      overflow: hidden;
      background: var(--bg-card, #131722);
    }
    .full-width { width: 100%; }
    .invoice-no { font-family: monospace; font-weight: 600; color: var(--accent-indigo); }
    .gst-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 800;
      border-radius: 4px;
      background: #0369a1;
      color: #e0f2fe;
      letter-spacing: 0.5px;
    }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
    .tax-subtext { font-size: 11px; color: #94a3b8; font-weight: normal; }
    .action-cell { text-align: right; }

    .clickable-row {
      cursor: pointer;
      transition: background 0.15s ease;
      &:hover {
        background: rgba(56, 189, 248, 0.08) !important;
      }
      &:active {
        background: rgba(56, 189, 248, 0.14) !important;
      }
    }

    .empty-state {
      padding: 48px 24px;
      text-align: center;
      color: #94a3b8;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }
    }

    /* ─── Preview Modal Styles ─── */
    .preview-modal-card {
      max-width: 960px;
      width: 95vw;
      height: 88vh;
      max-height: 880px;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      border-radius: 12px;
      background: #131722;
      border: 1px solid rgba(56, 189, 248, 0.35);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.7);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .invoice-icon-bubble {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      h2 {
        margin: 0;
        font-size: 1.15rem;
        font-family: monospace;
        font-weight: 700;
        color: #f8fafc;
      }
    }

    .preview-subtext {
      margin: 3px 0 0 0;
      font-size: 0.82rem;
      color: #94a3b8;
      strong {
        color: #cbd5e1;
      }
    }

    .header-right-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .download-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }

    .preview-body {
      flex: 1;
      padding: 0;
      overflow: hidden;
      position: relative;
      background: #0b0f19;
      display: flex;
      flex-direction: column;
    }

    .preview-loading-state,
    .preview-error-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
    }

    .spinner-bubble {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(56, 189, 248, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #38bdf8;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    .loading-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 6px 0;
    }

    .loading-subtitle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0 0 16px 0;
    }

    .warn-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #f87171;
      margin-bottom: 12px;
    }

    .pdf-container {
      width: 100%;
      height: 100%;
      flex: 1;
      display: flex;
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #1e293b;
    }

    .preview-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: rgba(15, 23, 42, 0.85);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .footer-amount-summary {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .total-label {
      font-size: 0.85rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .total-val {
      font-size: 1.15rem;
      font-weight: 700;
      color: #38bdf8;
      font-variant-numeric: tabular-nums;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `],
})
export default class InvoiceList implements OnInit, OnDestroy {
  invoices = signal<any[]>([]);
  selectedIds = signal<Set<string>>(new Set());
  showBulkDeleteModal = signal<boolean>(false);
  isBulkDeleting = signal<boolean>(false);
  invoiceToDelete = signal<any | null>(null);
  isDeleting = signal<boolean>(false);

  // Preview Modal State
  previewInvoice = signal<any | null>(null);
  pdfBlobUrl = signal<SafeResourceUrl | null>(null);
  isPdfLoading = signal<boolean>(false);
  isPdfDownloading = signal<boolean>(false);

  private cachedBlob: Blob | null = null;
  private currentBlobRawUrl: string | null = null;

  displayedColumns = ['select', 'invoiceNo', 'customer', 'date', 'amount', 'status', 'actions'];

  isAllSelected = computed(() => {
    const list = this.invoices();
    const sel = this.selectedIds();
    return list.length > 0 && list.every((i) => sel.has(i.id));
  });

  isSomeSelected = computed(() => {
    const list = this.invoices();
    const sel = this.selectedIds();
    return sel.size > 0 && !this.isAllSelected();
  });

  constructor(
    private api: SalesApiService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    this.cleanupPdfBlob();
  }

  load() {
    this.api.findAll().subscribe((res) => {
      this.invoices.set(res.data);
      const activeIds = new Set(res.data.map((i: any) => i.id));
      const currentSel = this.selectedIds();
      const nextSel = new Set<string>();
      for (const id of currentSel) {
        if (activeIds.has(id)) nextSel.add(id);
      }
      if (nextSel.size !== currentSel.size) {
        this.selectedIds.set(nextSel);
      }
    });
  }

  toggleSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.invoices().map((i) => i.id)));
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  // ─── Preview Modal Logic ───
  openPreview(invoice: any) {
    this.previewInvoice.set(invoice);
    this.isPdfLoading.set(true);
    this.cleanupPdfBlob();

    this.api.downloadInvoicePdf(invoice.id).subscribe({
      next: (blob) => {
        this.cachedBlob = blob;
        this.currentBlobRawUrl = window.URL.createObjectURL(blob);
        this.pdfBlobUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobRawUrl));
        this.isPdfLoading.set(false);
      },
      error: (err) => {
        console.error('PDF preview error:', err);
        this.isPdfLoading.set(false);
      },
    });
  }

  closePreview() {
    this.previewInvoice.set(null);
    this.cleanupPdfBlob();
  }

  private cleanupPdfBlob() {
    if (this.currentBlobRawUrl) {
      window.URL.revokeObjectURL(this.currentBlobRawUrl);
      this.currentBlobRawUrl = null;
    }
    this.cachedBlob = null;
    this.pdfBlobUrl.set(null);
  }

  // ─── Download Logic ───
  downloadInvoice(id: string) {
    const inv = this.invoices().find((i: any) => i.id === id) || this.previewInvoice();
    const safeName = inv?.invoiceNo ? inv.invoiceNo.replace(/[/\\?%*:|"<>]/g, '-') : `invoice-${id.slice(0, 8)}`;

    // Instant download if blob is already cached from the preview modal!
    if (this.previewInvoice()?.id === id && this.cachedBlob) {
      this.triggerBlobDownload(this.cachedBlob, safeName);
      return;
    }

    this.isPdfDownloading.set(true);
    this.snackBar.open('Generating PDF...', '', { duration: 1500 });
    this.api.downloadInvoicePdf(id).subscribe({
      next: (blob) => {
        this.isPdfDownloading.set(false);
        this.triggerBlobDownload(blob, safeName);
      },
      error: (err) => {
        this.isPdfDownloading.set(false);
        console.error('PDF download error:', err);
        this.snackBar.open('Could not generate invoice PDF', 'OK', { duration: 3000 });
      },
    });
  }

  private triggerBlobDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 1000);
    this.snackBar.open('Invoice downloaded successfully', 'OK', { duration: 3000 });
  }

  // ─── Bulk Delete Logic ───
  openBulkDeleteModal() {
    if (this.selectedIds().size === 0) return;
    this.showBulkDeleteModal.set(true);
  }

  closeBulkDeleteModal() {
    if (this.isBulkDeleting()) return;
    this.showBulkDeleteModal.set(false);
  }

  executeBulkDelete() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.isBulkDeleting.set(true);
    this.api.deleteMany(ids).subscribe({
      next: (res) => {
        this.isBulkDeleting.set(false);
        this.showBulkDeleteModal.set(false);
        this.clearSelection();
        this.snackBar.open(res.message || `${ids.length} invoices deleted`, 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isBulkDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Failed to delete selected invoices', 'OK', { duration: 3000 });
      },
    });
  }

  // ─── Single Delete Logic ───
  openDeleteModal(inv: any) {
    this.invoiceToDelete.set(inv);
  }

  closeDeleteModal() {
    if (this.isDeleting()) return;
    this.invoiceToDelete.set(null);
  }

  executeDelete() {
    const inv = this.invoiceToDelete();
    if (!inv) return;

    this.isDeleting.set(true);
    this.api.delete(inv.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        if (this.selectedIds().has(inv.id)) {
          const next = new Set(this.selectedIds());
          next.delete(inv.id);
          this.selectedIds.set(next);
        }
        this.invoiceToDelete.set(null);
        this.snackBar.open('Invoice deleted', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.snackBar.open(err.error?.message || 'Cannot delete invoice', 'OK', { duration: 3000 });
      },
    });
  }
}
