import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <!-- Ambient Glow Spheres for Glassmorphism Depth -->
      <div class="ambient-glow glow-1"></div>
      <div class="ambient-glow glow-2"></div>
      <div class="ambient-glow glow-3"></div>

      <div class="login-card">
        <!-- Brand Header -->
        <div class="login-header">
          <div class="logo-box">
            <img class="logo-icon" src="ion-shift-logo.png" alt="Ion Shift Engineering logo" />
          </div>
          <h1 class="brand-title">Ion Shift Engineering</h1>
          <p class="subtitle">Cloud Accounting & ERP Management System</p>
        </div>

        <!-- 1-Click Instant Demo Access -->
        <div class="quick-demo-banner">
          <div class="demo-info">
            <div class="badge-row">
              <span class="demo-badge">1-Click Access</span>
              <span class="live-dot-container">
                <span class="live-dot"></span> Active
              </span>
            </div>
            <p>Explore full dashboard & features instantly</p>
          </div>
          <button
            type="button"
            class="demo-quick-btn"
            [disabled]="loading() || demoLoading()"
            (click)="quickDemoLogin()"
          >
            @if (demoLoading()) {
              <mat-spinner diameter="18" />
            } @else {
              <span class="btn-inner">
                <mat-icon class="bolt-icon">bolt</mat-icon>
                <span>Instant Demo</span>
              </span>
            }
          </button>
        </div>

        <div class="divider">
          <span>or sign in with credentials</span>
        </div>

        <!-- Sign In Form -->
        <form (ngSubmit)="login()" class="login-form">
          <mat-form-field appearance="outline" class="glass-field">
            <mat-label>Email Address</mat-label>
            <input
              matInput
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="admin@gmail.com"
              required
              autocomplete="email"
            />
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="glass-field">
            <mat-label>Password</mat-label>
            <input
              matInput
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <mat-icon matPrefix>lock</mat-icon>
            <button
              mat-icon-button
              matSuffix
              type="button"
              class="toggle-pwd-btn"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (errorMessage()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <div class="error-text">
                <span>{{ errorMessage() }}</span>
                @if (isServerOffline()) {
                  <button type="button" class="fallback-btn" (click)="enterOfflineDemo()">
                    Continue in Offline Demo Mode →
                  </button>
                }
              </div>
            </div>
          }

          <button
            mat-flat-button
            type="submit"
            class="login-button"
            [disabled]="loading() || demoLoading()"
          >
            @if (loading()) {
              <mat-spinner diameter="20" />
            } @else {
              <span class="login-btn-content">
                <span>Sign In to Hisaab</span>
                <mat-icon class="arrow-icon">arrow_forward</mat-icon>
              </span>
            }
          </button>
        </form>

        <!-- Clickable Demo Credentials Pill -->
        <div class="demo-credentials" (click)="fillDemoCredentials()" title="Click to auto-fill demo account">
          <div class="demo-cred-header">
            <mat-icon class="key-icon">vpn_key</mat-icon>
            <span>Demo Credentials (click to auto-fill):</span>
          </div>
          <code>admin&#64;gmail.com / admin123</code>
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
      padding: 24px 16px;
      overflow: hidden;
      background:
        radial-gradient(ellipse 70% 50% at 15% 10%, rgba(56, 189, 248, 0.15), transparent 65%),
        radial-gradient(ellipse 60% 45% at 85% 20%, rgba(139, 92, 246, 0.16), transparent 60%),
        radial-gradient(ellipse 80% 60% at 50% 90%, rgba(99, 102, 241, 0.12), transparent 70%),
        #080d1a;
      background-attachment: fixed;
    }

    /* Ambient Lighting Orbs for Glass Refraction */
    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
      opacity: 0.65;
    }

    .glow-1 {
      width: 420px;
      height: 420px;
      background: radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, transparent 70%);
      top: 5%;
      left: 15%;
      animation: floatSlow 12s infinite alternate ease-in-out;
    }

    .glow-2 {
      width: 480px;
      height: 480px;
      background: radial-gradient(circle, rgba(168, 85, 247, 0.24) 0%, transparent 70%);
      bottom: 5%;
      right: 15%;
      animation: floatSlow 14s infinite alternate-reverse ease-in-out;
    }

    .glow-3 {
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, transparent 70%);
      top: 45%;
      right: 35%;
      animation: floatSlow 10s infinite alternate ease-in-out;
    }

    @keyframes floatSlow {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, -25px) scale(1.08); }
    }

    /* Glassmorphism Card with Radiant Glow Accent */
    .login-card {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 460px;
      background: rgba(19, 29, 45, 0.65);
      backdrop-filter: blur(24px) saturate(190%);
      -webkit-backdrop-filter: blur(24px) saturate(190%);
      border: 1px solid rgba(56, 189, 248, 0.28);
      border-radius: 24px;
      padding: 40px 36px;
      box-shadow:
        inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
        0 24px 64px -8px rgba(0, 0, 0, 0.75),
        0 0 32px -4px rgba(56, 189, 248, 0.25);
      transition: transform var(--transition-normal), box-shadow var(--transition-normal), border-color var(--transition-normal);
      animation: loginCardAppear 450ms cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: rgba(56, 189, 248, 0.45);
        box-shadow:
          inset 0 1px 0 0 rgba(255, 255, 255, 0.25),
          0 28px 72px -8px rgba(0, 0, 0, 0.8),
          0 0 40px -2px rgba(56, 189, 248, 0.35);
      }
    }

    @keyframes loginCardAppear {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Brand Header */
    .login-header {
      text-align: center;
      margin-bottom: 24px;

      .logo-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(56, 189, 248, 0.3);
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.3);
        margin-bottom: 14px;
        transition: transform var(--transition-spring), box-shadow var(--transition-fast);

        &:hover {
          transform: scale(1.08) rotate(2deg);
          box-shadow: 0 0 32px rgba(56, 189, 248, 0.5);
        }
      }

      .logo-icon {
        width: 54px;
        height: 54px;
        object-fit: cover;
        border-radius: 14px;
      }

      .brand-title {
        font-size: 1.75rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 4px;
      }

      .subtitle {
        color: #94a3b8;
        font-size: 0.88rem;
        font-weight: 500;
      }
    }

    /* Quick 1-Click Demo Banner */
    .quick-demo-banner {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(139, 92, 246, 0.14) 100%);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 16px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 22px;
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 8px 20px rgba(0, 0, 0, 0.25);
      transition: all var(--transition-fast);

      &:hover {
        border-color: rgba(56, 189, 248, 0.55);
        box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 0 20px rgba(56, 189, 248, 0.2);
      }

      .demo-info {
        display: flex;
        flex-direction: column;
        gap: 5px;

        .badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .demo-badge {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          background: rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.4);
        }

        .live-dot-container {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.72rem;
          color: #34d399;
          font-weight: 600;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          background: #34d399;
          border-radius: 50%;
          box-shadow: 0 0 8px #34d399;
          animation: pulseDot 2s infinite;
        }

        p {
          font-size: 0.8rem;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.3;
        }
      }

      .demo-quick-btn {
        background: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #7c3aed 100%);
        color: #ffffff;
        font-weight: 700;
        font-size: 0.85rem;
        padding: 0 16px;
        height: 40px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 12px;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.45);
        transition: transform var(--transition-spring), box-shadow var(--transition-fast);

        &:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 0 24px rgba(56, 189, 248, 0.6);
        }

        &:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .btn-inner {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .bolt-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: #fbbf24;
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.8));
        }
      }
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 16px 0 22px;
      color: #64748b;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.6px;

      &::before,
      &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      span {
        padding: 0 12px;
      }
    }

    /* Form Fields */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .toggle-pwd-btn {
      color: #94a3b8;
      transition: color var(--transition-fast);
      &:hover { color: #38bdf8; }
    }

    /* Error Banner with Offline Recovery */
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      color: #fca5a5;
      font-size: 0.86rem;
      margin-bottom: 8px;
      animation: shake 0.3s ease-in-out;

      mat-icon {
        color: #ef4444;
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .error-text {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }

      .fallback-btn {
        align-self: flex-start;
        background: rgba(56, 189, 248, 0.2);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.4);
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: background var(--transition-fast);

        &:hover {
          background: rgba(56, 189, 248, 0.35);
        }
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }

    /* Submit Button */
    .login-button {
      height: 48px;
      font-size: 0.96rem;
      font-weight: 700;
      margin-top: 8px;
      border-radius: 12px !important;
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 16px rgba(2, 132, 199, 0.35);
      transition: transform var(--transition-spring), box-shadow var(--transition-fast) !important;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.5) !important;
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      .login-btn-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .arrow-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        transition: transform var(--transition-fast);
      }

      &:hover .arrow-icon {
        transform: translateX(3px);
      }
    }

    /* Clickable Demo Credentials Pill */
    .demo-credentials {
      margin-top: 24px;
      text-align: center;
      background: rgba(255, 255, 255, 0.035);
      border: 1px dashed rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(56, 189, 248, 0.08);
        border-color: rgba(56, 189, 248, 0.6);
        transform: translateY(-1px);
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.2);

        code {
          color: #38bdf8;
        }
      }

      .demo-cred-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 0.78rem;
        color: #94a3b8;
        font-weight: 600;

        .key-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
          color: #38bdf8;
        }
      }

      code {
        display: inline-block;
        margin-top: 4px;
        color: #cbd5e1;
        font-size: 0.85rem;
        font-family: monospace;
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: color var(--transition-fast);
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
  isServerOffline = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('hisaab-theme', 'dark');
  }

  quickDemoLogin() {
    this.demoLoading.set(true);
    this.errorMessage.set('');
    this.isServerOffline.set(false);

    this.authService.loginAsDemo().subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.demoLoading.set(false);
        if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
          this.isServerOffline.set(true);
          this.errorMessage.set(
            'Backend server is not connected. You can still explore in offline demo mode.',
          );
        } else {
          this.errorMessage.set(
            err.error?.message || 'Failed to start demo session',
          );
        }
      },
    });
  }

  fillDemoCredentials() {
    this.email = 'admin@gmail.com';
    this.password = 'admin123';
    this.errorMessage.set('');
    this.login();
  }

  enterOfflineDemo() {
    // Allows instant offline exploration if the API is offline
    const mockUser = {
      id: 'demo-user-1',
      name: 'Admin User',
      email: 'admin@gmail.com',
      role: 'OWNER',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('accessToken', 'offline-demo-access-token');
    localStorage.setItem('refreshToken', 'offline-demo-refresh-token');
    localStorage.setItem('user', JSON.stringify(mockUser));
    this.router.navigate(['/dashboard']);
  }

  login() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.isServerOffline.set(false);

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
          this.isServerOffline.set(true);
          this.errorMessage.set(
            'Backend server is not reachable on http://localhost:3000. Start it with "npm start" or explore in offline demo mode.',
          );
        } else {
          this.errorMessage.set(
            err.error?.message || 'Invalid email or password. Click the demo pill below to auto-fill.',
          );
        }
      },
    });
  }
}
