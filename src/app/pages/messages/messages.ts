import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-messages',
  imports: [FormsModule, DatePipe, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './messages.html',
  styleUrl: './messages.scss',
})
export class Messages implements OnInit, OnDestroy {
  id = input<string>(); // :id
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  conversations = signal<any[]>([]);
  messages = signal<any[]>([]);
  text = '';
  private timer?: any;

  constructor() { effect(() => { const id = this.id(); if (id) this.loadMessages(id); else this.messages.set([]); }); }
  ngOnInit() {
    this.loadList();
    this.timer = setInterval(() => { this.loadList(); const id = this.id(); if (id) this.loadMessages(id, false); }, 8000); // simple polling
  }
  ngOnDestroy() { clearInterval(this.timer); }
  loadList() { this.api.conversations().subscribe(p => this.conversations.set(p.content)); }
  loadMessages(id: string, markRead = true) {
    this.api.messages(id).subscribe(m => this.messages.set([...m].reverse())); // API returns newest first
    if (markRead) this.api.markRead(id).subscribe();
  }
  open(id: string) { this.router.navigate(['/messages', id]); }
  send() {
    const id = this.id(); const text = this.text.trim();
    if (!id || !text) return;
    this.api.sendMessage(id, text).subscribe(m => { this.messages.update(l => [...l, m]); this.text = ''; });
  }
}
