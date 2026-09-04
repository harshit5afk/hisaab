import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  private accessToken = signal<string | null>(
    localStorage.getItem('accessToken'),
  );
  private refreshToken = signal<string | null>(
    localStorage.getItem('refreshToken'),
  );
  private currentUser = signal<User | null>(
    JSON.parse(localStorage.getItem('user') || 'null'),
  );

  readonly isLoggedIn = computed(() => !!this.accessToken());
  readonly user = computed(() => this.currentUser());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.setTokens(response);
        }),
      );
  }

  loginAsDemo() {
    return this.login('admin@hisaab.app', 'admin123');
  }

  refresh() {
    const token = this.refreshToken();
    if (!token) return;

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/refresh`, {
        refreshToken: token,
      })
      .pipe(
        tap((response) => {
          this.setTokens(response);
        }),
      );
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  private setTokens(response: LoginResponse) {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.accessToken.set(response.accessToken);
    this.refreshToken.set(response.refreshToken);
    this.currentUser.set(response.user);
  }
}
