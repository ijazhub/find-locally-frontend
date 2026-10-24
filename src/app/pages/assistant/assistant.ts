import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { InrPipe } from '../../shared/inr.pipe';

interface Turn { from: 'me' | 'niva'; text: string; recs?: any[]; booked?: boolean }

@Component({
  selector: 'app-assistant',
  imports: [FormsModule, DatePipe, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, InrPipe],
  templateUrl: './assistant.html',
  styleUrl: './assistant.scss',
})
export class Assistant {
  private api = inject(ApiService);
  turns = signal<Turn[]>([]);
  busy = signal(false);
  text = '';
  private threadId?: string;

  send() {
    const text = this.text.trim(); if (!text) return;
    this.text = ''; this.busy.set(true);
    this.turns.update(t => [...t, { from: 'me', text }]);
    this.api.ask(text, this.threadId).subscribe({
      next: r => { this.threadId = r.threadId; this.turns.update(t => [...t, { from: 'niva', text: r.text, recs: r.recommendations }]); this.busy.set(false); },
      error: () => { this.turns.update(t => [...t, { from: 'niva', text: 'Sorry, something went wrong. Please try again.' }]); this.busy.set(false); },
    });
  }
  book(r: any) {
    this.api.assistantBook(this.threadId!, r.recommendationId).subscribe(() => {
      this.turns.update(t => [...t.map(x => ({ ...x, booked: true })), { from: 'niva', text: `Done. I've asked ${r.provider.businessName} to confirm. You can follow it under Bookings.` }]);
    });
  }
}
