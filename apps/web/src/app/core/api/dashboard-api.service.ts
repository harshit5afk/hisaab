import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DashboardApiService extends ApiService {
  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/stats`);
  }

  getMonthlySummary(months = 6): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard/monthly`, {
      params: this.buildParams({ months }),
    });
  }
}
