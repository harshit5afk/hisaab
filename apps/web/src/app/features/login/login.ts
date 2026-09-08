import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'hisaab-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <div class="theme-bar">
        <label class="theme-picker" aria-label="Select theme">
          <mat-icon>palette</mat-icon>
          <select [value]="selectedTheme()" (change)="changeTheme($any($event.target).value)">
            @for (theme of themeOptions; track theme.value) {
              <option [value]="theme.value">{{ theme.label }}</option>
            }
          </select>
        </label>
      </div>

      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">₹</div>
          <h1>Hisaab</h1>
          <p class="subtitle">Accounting & Business Management</p>
        </div>

        <!-- Quick 1-Click Demo Login Banner -->
        <div class="quick-demo-banner">
          <div class="demo-info">
            <span class="badge">Demo Access</span>
            <p>Try Hisaab instantly without typing credentials</p>
          </div>
          <button
            mat-flat-button
            type="button"
            class="demo-quick-btn"
            [disabled]="loading() || demoLoading()"
            (click)="quickDemoLogin()"
          >
            @if (demoLoading()) {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon>bolt</mat-icon>
              <span>Explore Demo</span>
            }
          </button>
        </div>

        <div class="divider">
          <span>or sign in with credentials</span>
        </div>

        <form (ngSubmit)="login()" class="login-form">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input
              matInput
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
            />
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input
              matInput
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              required
              autocomplete="current-password"
            />
            <mat-icon matPrefix>lock</mat-icon>
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="showPassword.set(!showPassword())"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (errorMessage()) {
            <div class="error-message">
              <mat-icon>error_outline</mat-icon>
              {{ errorMessage() }}
            </div>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            class="login-button"
            [disabled]="loading() || demoLoading()"
          >
            @if (loading()) {
              <mat-spinner diameter="20" />
            } @else {
              Sign In
            }
          </button>
        </form>

        <div class="demo-credentials" (click)="fillDemoCredentials()" title="Click to auto-fill">
          <p>Demo credentials (click to auto-fill):</p>
          <code>admin&#64;hisaab.app / admin123</code>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--page-bg);
      padding: 16px;
    }

    .theme-bar {
      position: absolute;
      top: 20px;
      right: 20px;
    }

    .theme-picker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.25);
      color: var(--text-primary);
      box-shadow: var(--shadow-sm);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      select {
        appearance: none;
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: 0.85rem;
        font-weight: 600;
        outline: none;
        cursor: pointer;
      }
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 40px 36px;
      box-shadow: var(--shadow-lg);
    }

    .login-header {
      text-align: center;
      margin-bottom: 24px;

      .logo-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        background: var(--gradient-primary);
        border-radius: 16px;
        font-size: 1.8rem;
        font-weight: 700;
        color: white;
        margin-bottom: 12px;
        box-shadow: 0 8px 24px rgba(103, 80, 164, 0.35);
      }

      h1 {
        font-size: 1.85rem;
        font-weight: 700;
        background: linear-gradient(135deg, #8ab4f8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle {
        color: var(--text-secondary);
        margin-top: 4px;
        font-size: 0.88rem;
      }
    }

    .quick-demo-banner {
      background: linear-gradient(135deg, rgba(138, 180, 248, 0.12), rgba(192, 132, 252, 0.12));
      border: 1px solid rgba(138, 180, 248, 0.3);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;

      .demo-info {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .badge {
          align-self: flex-start;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(138, 180, 248, 0.25);
          color: #8ab4f8;
          padding: 2px 8px;
          border-radius: 6px;
        }

        p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.25;
        }
      }

      .demo-quick-btn {
        background: var(--gradient-primary);
        color: white;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 0 14px;
        height: 38px;
        border-radius: 20px;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 12px rgba(103, 80, 164, 0.3);
        transition: transform 0.15s ease, box-shadow 0.15s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(103, 80, 164, 0.45);
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 16px 0 20px;
      color: var(--text-muted);
      font-size: 0.78rem;

      &::before,
      &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border-color);
      }

      span {
        padding: 0 12px;
      }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .login-button {
      height: 46px;
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 6px;
      border-radius: var(--radius-sm) !important;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(242, 139, 130, 0.1);
      color: var(--accent-red);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
    }

    .demo-credentials {
      margin-top: 20px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-sm);
      transition: background 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.04);

        code {
          color: #8ab4f8;
        }
      }

      code {
        display: block;
        margin-top: 4px;
        color: var(--text-secondary);
        font-size: 0.85rem;
        transition: color 0.15s;
      }
    }
  `],
})
export default class Login {
  email = '';
  password = '';
  loading = signal(false);
  demoLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');
  selectedTheme = signal<'light' | 'dark' | 'ocean' | 'forest' | 'sunset'>(this.getStoredTheme());

  themeOptions = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'ocean', label: 'Ocean' },
    { value: 'forest', label: 'Forest' },
    { value: 'sunset', label: 'Sunset' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.applyTheme(this.selectedTheme());
  }

  changeTheme(theme: 'light' | 'dark' | 'ocean' | 'forest' | 'sunset') {
    this.selectedTheme.set(theme);
    this.applyTheme(theme);
  }

  private getStoredTheme(): 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' {
    const savedTheme = localStorage.getItem('hisaab-theme');
    return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'ocean' || savedTheme === 'forest' || savedTheme === 'sunset'
      ? savedTheme
      : 'dark';
  }

  private applyTheme(theme: 'light' | 'dark' | 'ocean' | 'forest' | 'sunset') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hisaab-theme', theme);
  }

  quickDemoLogin() {
    this.demoLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginAsDemo().subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.demoLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to start demo session',
        );
      },
    });
  }

  fillDemoCredentials() {
    this.email = 'admin@hisaab.app';
    this.password = 'admin123';
  }

  login() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Invalid email or password',
        );
      },
    });
  }
}
