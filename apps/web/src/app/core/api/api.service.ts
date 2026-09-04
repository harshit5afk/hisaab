import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  protected apiUrl = environment.apiUrl;

  constructor(protected http: HttpClient) {}

  protected buildParams(filters: Record<string, any>): HttpParams {
    let params = new HttpParams();
    for (const key of Object.keys(filters)) {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    }
    return params;
  }
}
