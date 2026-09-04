import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PaymentsApiService extends ApiService {
  findAll(filters: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments`, {
      params: this.buildParams(filters),
    });
  }

  findOne(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payments/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payments`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payments/${id}`);
  }
}
