import { Pipe, PipeTransform } from '@angular/core';

/**
 * Converts paise (integer) to formatted ₹ string.
 * Usage: {{ 150050 | paiseToRupees }} → "₹1,500.50"
 */
@Pipe({ name: 'paiseToRupees', standalone: true })
export class PaiseToRupeesPipe implements PipeTransform {
  transform(paise: number | null | undefined): string {
    if (paise === null || paise === undefined) return '₹0.00';
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(rupees);
  }
}
