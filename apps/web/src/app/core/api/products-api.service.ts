import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ProductPurchase {
  id: string;
  billNo?: string;
  vendor?: string;
  date: string;
  amount: number; // in paise
  quantity?: number;
}

export interface Product {
  id: string;
  name: string;
  hsn?: string;
  unit: string;
  rate: number; // in paise
  stock: number; // current inventory quantity
  purchases?: ProductPurchase[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsApiService extends ApiService {
  findAll(filters: { search?: string; page?: number; limit?: number } = {}): Observable<{ data: Product[]; total: number }> {
    return this.http.get<{ data: Product[]; total: number }>(`${this.apiUrl}/products`, {
      params: this.buildParams(filters),
    });
  }

  findOne(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  create(data: { name: string; hsn?: string; unit?: string; rate: number }): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, data);
  }

  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}`, data);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/products/${id}`);
  }
}
