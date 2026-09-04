import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './core/layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login'),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard') },

      { path: 'customers', loadComponent: () => import('./features/customers/customer-list') },
      { path: 'customers/new', loadComponent: () => import('./features/customers/customer-form') },
      { path: 'customers/:id', loadComponent: () => import('./features/customers/customer-form') },

      { path: 'sales', loadComponent: () => import('./features/sales/invoice-list') },
      { path: 'sales/new', loadComponent: () => import('./features/sales/invoice-form') },

      { path: 'purchases', loadComponent: () => import('./features/purchases/purchase-list') },
      { path: 'purchases/new', loadComponent: () => import('./features/purchases/purchase-form') },

      { path: 'payments', loadComponent: () => import('./features/payments/payment-list') },
      { path: 'payments/new', loadComponent: () => import('./features/payments/payment-form') },

      { path: 'receivables', loadComponent: () => import('./features/receivables/receivables-list') },
      { path: 'receivables/:customerId', loadComponent: () => import('./features/receivables/customer-ledger') },

      { path: 'ai/scan', loadComponent: () => import('./features/ai/invoice-scanner') },
      { path: 'ai/query', loadComponent: () => import('./features/ai/ai-query') },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
