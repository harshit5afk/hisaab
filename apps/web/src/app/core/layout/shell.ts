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
      background: var(--page-bg);
    }

    .sidebar {
      width: 260px;
      background: linear-gradient(180deg, var(--sidebar-start), var(--sidebar-end));
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
      z-index: 100;
      box-shadow: 20px 0 40px rgba(19, 31, 73, 0.12);

      &.collapsed {
        width: 72px;
      }
    }

    .sidebar-header {
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #60a5fa 0%, #8b5cf6 100%);
      border-radius: 12px;
      font-size: 1.3rem;
      font-weight: 800;
      color: white;
      flex-shrink: 0;
      box-shadow: 0 8px 18px rgba(99, 102, 241, 0.35);
    }

    .logo-text {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #eef4ff;
    }

    .sidebar-nav {
      flex: 1;
      padding: 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border-radius: 12px;
      color: var(--sidebar-text);
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
        background: var(--sidebar-hover);
        color: #ffffff;
      }

      &.active {
        background: var(--sidebar-active);
        color: #f8fbff;
        box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.22);

        mat-icon {
          color: #8ad6ff;
        }
      }
    }

    .nav-label {
      font-size: 0.9rem;
      font-weight: 600;
    }

    .sidebar-footer {
      padding: 8px 10px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: transparent;
    }

    .top-bar {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      height: 72px;
      border-bottom: 1px solid var(--border-color);
      background: var(--topbar-bg);
      backdrop-filter: blur(10px);
      flex-shrink: 0;
      gap: 12px;
    }

    .spacer {
      flex: 1;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(79, 110, 247, 0.06);
      color: var(--text-secondary);
      border: 1px solid var(--border-color);

      .user-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-primary);
      }
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
      background: transparent;
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
    { icon: 'inventory_2', label: 'Products', route: '/products' },
    { icon: 'receipt_long', label: 'Sales', route: '/sales' },
    { icon: 'shopping_cart', label: 'Purchases', route: '/purchases' },
    { icon: 'payments', label: 'Payments', route: '/payments' },
    { icon: 'account_balance', label: 'Receivables', route: '/receivables' },
    { icon: 'document_scanner', label: 'AI Scanner', route: '/ai/scan' },
    { icon: 'smart_toy', label: 'AI Query', route: '/ai/query' },
  ];

  constructor(public authService: AuthService) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('hisaab-theme', 'dark');
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((v) => !v);
  }
}
