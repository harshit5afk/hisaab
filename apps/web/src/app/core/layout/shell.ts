import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'hisaab-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  template: `
    <div class="shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <div class="logo" (click)="toggleSidebar()">
            <span class="logo-icon">₹</span>
            @if (!sidebarCollapsed()) {
              <span class="logo-text">Hisaab</span>
            }
          </div>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [matTooltip]="sidebarCollapsed() ? item.label : ''"
              matTooltipPosition="right"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (!sidebarCollapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <a class="nav-item" (click)="authService.logout()">
            <mat-icon>logout</mat-icon>
            @if (!sidebarCollapsed()) {
              <span class="nav-label">Logout</span>
            }
          </a>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="top-bar">
          <button mat-icon-button (click)="toggleSidebar()">
            <mat-icon>menu</mat-icon>
          </button>
          <div class="spacer"></div>
          <div class="user-info">
            <mat-icon>account_circle</mat-icon>
            <span class="user-name">{{ authService.user()?.name }}</span>
          </div>
        </header>

        <div class="content-area">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
      z-index: 100;

      &.collapsed {
        width: 68px;
      }
    }

    .sidebar-header {
      padding: 20px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
    }

    .logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--gradient-primary);
      border-radius: 10px;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #8ab4f8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;

      mat-icon {
        flex-shrink: 0;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-primary);
      }

      &.active {
        background: rgba(138, 180, 248, 0.12);
        color: var(--accent-indigo);

        mat-icon {
          color: var(--accent-indigo);
        }
      }
    }

    .nav-label {
      font-size: 0.9rem;
      font-weight: 500;
    }

    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid var(--border-color);
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .top-bar {
      display: flex;
      align-items: center;
      padding: 8px 24px;
      height: 56px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
      flex-shrink: 0;
    }

    .spacer {
      flex: 1;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);

      .user-name {
        font-size: 0.9rem;
        font-weight: 500;
      }
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;

        &.collapsed {
          width: 0;
          padding: 0;
          overflow: hidden;
          border: none;
        }
      }

      .content-area {
        padding: 16px;
      }
    }
  `],
})
export class Shell {
  sidebarCollapsed = signal(false);

  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'people', label: 'Customers', route: '/customers' },
    { icon: 'receipt_long', label: 'Sales', route: '/sales' },
    { icon: 'shopping_cart', label: 'Purchases', route: '/purchases' },
    { icon: 'payments', label: 'Payments', route: '/payments' },
    { icon: 'account_balance', label: 'Receivables', route: '/receivables' },
    { icon: 'document_scanner', label: 'AI Scanner', route: '/ai/scan' },
    { icon: 'smart_toy', label: 'AI Query', route: '/ai/query' },
  ];

  constructor(public authService: AuthService) {}

  toggleSidebar() {
    this.sidebarCollapsed.update((v) => !v);
  }
}
