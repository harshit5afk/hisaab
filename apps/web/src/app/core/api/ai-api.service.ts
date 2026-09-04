import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  extractInvoice(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/ai/extract-invoice`, formData);
  }

  query(question: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ai/query`, { question });
  }
}
