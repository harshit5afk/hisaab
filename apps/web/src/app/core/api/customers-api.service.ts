import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CustomersApiService extends ApiService {
  findAll(filters: { search?: string; page?: number; limit?: number } = {}): Observable<any> {
    return this.http.get(`${this.apiUrl}/customers`, {
      params: this.buildParams(filters),
    });
  }

  findOne(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/customers/${id}`);
  }

  create(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/customers`, data);
  }

  update(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/customers/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/customers/${id}`);
  }
}
