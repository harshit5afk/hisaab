import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SalesApiService extends ApiService {
  findAll(filters: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/sales`, {
      params: this.buildParams(filters),
    });
  }

  findOne(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/sales/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sales`, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/sales/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sales/${id}`);
  }

  downloadInvoicePdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/sales/${id}/invoice/pdf`, {
      responseType: 'blob',
    });
  }
}

