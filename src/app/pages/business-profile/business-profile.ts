import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { firstValueFrom, filter, tap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { BusinessProfileUpdate, MediaItem, MediaUpdate } from '../../core/models';
import { problemMessage } from '../../core/problem';

@Component({ imports: [FormsModule, MatButtonModule, RouterLink], templateUrl: './business-profile.html', styles: [`label { display:flex; flex-direction:column; gap:8px; } input,textarea,select { padding:12px; font:inherit; border:1px solid #8b9c8d; border-radius:8px; box-sizing:border-box; max-width:100%; } .media { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:20px; } img,video { width:100%; max-height:300px; object-fit:contain; } .editor { max-width:720px; }`] })
export class BusinessProfileEditor implements OnInit, OnDestroy {
  api = inject(ApiService); auth = inject(AuthService);
  draft: BusinessProfileUpdate = {}; items = signal<MediaItem[]>([]);
  loading = signal(false); pending = signal(false); error = signal(''); notice = signal(''); progress = signal<number | null>(null);
  profileLoaded = signal(false);
  file?: File; cover?: File; avatar?: File; profileCover?: File;
  uploadId?: string; coverId?: string; avatarId?: string; profileCoverId?: string;
  mediaDraft: MediaUpdate = { caption: '', presentationFormat: 'STANDARD', publicationState: 'DRAFT' };
  edits: Record<string, MediaUpdate> = {};
  page = 0; totalPages = 0;
  private timer?: ReturnType<typeof setInterval>;
  private wake = () => { if (!document.hidden) void this.refreshMedia(); };
  ngOnInit() { void this.load(); document.addEventListener('visibilitychange', this.wake); window.addEventListener('online', this.wake); this.timer = setInterval(() => { if (!document.hidden && !this.pending() && this.items().some(m => m.processingState === 'PENDING')) void this.refreshMedia(); }, 8000); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { const p = await firstValueFrom(this.api.businessProfile()); this.draft = { businessName: p.businessName, bio: p.bio, note: p.note, neighbourhood: p.neighbourhood, workMode: p.workMode }; this.profileLoaded.set(true); await this.refreshMedia(); }
    catch (e) { this.error.set(problemMessage(e)); } finally { this.loading.set(false); }
  }
  async run(work: () => Promise<void>) { if (this.pending()) return; this.pending.set(true); this.error.set(''); this.notice.set(''); try { await work(); } catch (e) { this.error.set(problemMessage(e)); } finally { this.pending.set(false); this.progress.set(null); } }
  pick(event: Event, kind: 'file' | 'cover' | 'avatar' | 'profileCover') {
    const file = (event.target as HTMLInputElement).files?.[0]; this[kind] = file;
    if (kind === 'file') this.uploadId = undefined; else if (kind === 'cover') this.coverId = undefined; else if (kind === 'avatar') this.avatarId = undefined; else this.profileCoverId = undefined;
  }
  save(form: NgForm) {
    if (form.invalid) return;
    void this.run(async () => {
      if (this.avatar && !this.avatarId) this.avatarId = await this.api.upload(this.avatar, 'AVATAR');
      if (this.profileCover && !this.profileCoverId) this.profileCoverId = await this.api.upload(this.profileCover, 'COVER');
      await firstValueFrom(this.api.updateBusinessProfile({ ...this.draft, ...(this.avatarId ? { avatarUploadId: this.avatarId } : {}), ...(this.profileCoverId ? { coverUploadId: this.profileCoverId } : {}) }));
      this.notice.set('Business profile saved.');
    });
  }
  async refreshMedia(append = false) {
    try {
      const page = await firstValueFrom(this.api.ownMedia(append ? this.page + 1 : 0));
      this.page = append ? this.page + 1 : 0; this.totalPages = page.totalPages;
      this.items.update(list => append ? [...list, ...page.content] : page.content);
      for (const m of page.content) this.edits[m.id] ??= { caption: m.caption, presentationFormat: m.presentationFormat, publicationState: m.publicationState };
    } catch (e) { this.error.set(problemMessage(e, 'Could not refresh the media library. Please retry.')); }
  }
  attach() {
    if (!this.file || (this.mediaDraft.caption?.length || 0) > 80) return;
    void this.run(async () => {
      if (!this.uploadId) {
        const response = await firstValueFrom(this.api.uploadEvents(this.file!, this.file!.type.startsWith('video/') ? 'GALLERY_VIDEO' : 'GALLERY_PHOTO').pipe(
          tap(event => { if (event.type === HttpEventType.UploadProgress) this.progress.set(event.total ? Math.round(event.loaded / event.total * 100) : null); }),
          filter(event => event.type === HttpEventType.Response),
        ));
        this.uploadId = response.body!.uploadId;
      }
      if (this.cover && !this.coverId) this.coverId = await this.api.upload(this.cover, 'COVER');
      await firstValueFrom(this.api.addMedia(this.uploadId!, { ...this.mediaDraft, ...(this.coverId ? { coverUploadId: this.coverId } : {}) }));
      this.file = undefined; this.cover = undefined; this.uploadId = undefined; this.coverId = undefined;
      this.notice.set('Media attached. Processing and publication status come from the server.'); await this.refreshMedia();
    });
  }
  update(item: MediaItem) { void this.run(async () => { await firstValueFrom(this.api.updateMedia(item.id, this.edits[item.id])); this.notice.set('Media saved.'); await this.refreshMedia(); }); }
  remove(item: MediaItem) { void this.run(async () => { await firstValueFrom(this.api.deleteMedia(item.id)); this.items.update(list => list.filter(m => m.id !== item.id)); this.notice.set('Media deleted.'); }); }
  ngOnDestroy() { clearInterval(this.timer); document.removeEventListener('visibilitychange', this.wake); window.removeEventListener('online', this.wake); }
}
