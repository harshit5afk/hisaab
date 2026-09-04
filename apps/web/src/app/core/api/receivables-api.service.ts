import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReceivablesApiService extends ApiService {
  getBalances(): Observable<any> {
    return this.http.get(`${this.apiUrl}/receivables`);
  }

  getLedger(customerId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/receivables/${customerId}/ledger`);
  }
}
