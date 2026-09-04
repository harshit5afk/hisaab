import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PurchasesApiService extends ApiService {
  findAll(filters: any = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/purchases`, {
      params: this.buildParams(filters),
    });
  }

  findOne(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/purchases/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/purchases`, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/purchases/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/purchases/${id}`);
  }
}
