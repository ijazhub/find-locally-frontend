import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Address, ProviderSummary } from '../../core/models';
import { ProviderCard } from '../../shared/provider-card/provider-card';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatTabsModule, ProviderCard],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  name = ''; email = '';
  saved = signal(false);
  addresses = signal<Address[]>([]);
  following = signal<ProviderSummary[]>([]);
  addr: Address = { line1: '', city: 'Pune', pincode: '' };

  ngOnInit() {
    this.name = this.auth.user()?.name ?? ''; this.email = this.auth.user()?.email ?? '';
    this.api.addresses().subscribe(a => this.addresses.set(a));
    this.api.following().subscribe(p => this.following.set(p.content));
  }
  saveDetails() { this.api.updateMe({ name: this.name, email: this.email || undefined }).subscribe(() => { this.auth.loadMe(); this.saved.set(true); }); }
  addAddress() { this.api.addAddress(this.addr).subscribe(a => { this.addresses.update(l => [...l, a]); this.addr = { line1: '', city: 'Pune', pincode: '' }; }); }
  removeAddress(a: Address) { this.api.deleteAddress(a.id!).subscribe(() => this.addresses.update(l => l.filter(x => x.id !== a.id))); }
}
