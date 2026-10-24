import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ProviderSummary } from '../../core/models';
import { ProviderCard } from '../../shared/provider-card/provider-card';

@Component({
  selector: 'app-saved',
  imports: [RouterLink, ProviderCard],
  templateUrl: './saved.html',
  styleUrl: './saved.scss',
})
export class Saved implements OnInit {
  private api = inject(ApiService);
  items = signal<ProviderSummary[]>([]);
  loaded = signal(false);
  ngOnInit() { this.api.saved().subscribe(p => { this.items.set(p.content.map(x => ({ ...x, saved: true }))); this.loaded.set(true); }); }
  remove(id: string) { this.items.update(l => l.filter(p => p.id !== id)); }
}
