import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '../core/models';

/** Money is stored in paise; show it as ₹1,200. */
@Pipe({ name: 'inr' })
export class InrPipe implements PipeTransform {
  transform(m?: Money | null): string {
    return m ? '₹' + (m.amount / 100).toLocaleString('en-IN') : '';
  }
}
