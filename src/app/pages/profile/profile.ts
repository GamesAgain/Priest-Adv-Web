import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, of, switchMap } from 'rxjs';
import { Header } from '../header/header';
import { AuthService } from '../../services/auth';
import { MockBackendService } from '../../services/mock-backend.service';
import { User, Game, Transaction } from '../../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, NgSwitch, NgSwitchCase, FormsModule, Header],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(MockBackendService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<User | null>(null);
  readonly username = signal('');
  readonly email = signal('');
  readonly avatarPreview = signal<string | null>(null);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly isSaving = signal(false);
  private avatarFile: File | null = null;

  readonly ownedGames$ = this.auth.currentUser$.pipe(
    switchMap((user) => {
      if (!user) {
        return of([] as Game[]);
      }
      return this.backend.games$.pipe(
        map((games) => games.filter((game) => user.ownedGames.includes(game.id)))
      );
    })
  );

  readonly transactions$ = this.auth.currentUser$.pipe(
    switchMap((user) => (user ? this.backend.listTransactions(user.id) : of([] as Transaction[])))
  );

  constructor() {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      this.user.set(user);
      this.username.set(user.username);
      this.email.set(user.email);
      this.avatarPreview.set(user.avatarUrl ?? null);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    this.avatarFile = input.files[0];
    const reader = new FileReader();
    reader.onload = () => this.avatarPreview.set(reader.result as string);
    reader.readAsDataURL(this.avatarFile);
  }

  async saveProfile(): Promise<void> {
    const currentUser = this.user();
    if (!currentUser || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    let avatarUrl = currentUser.avatarUrl ?? null;

    try {
      if (this.avatarFile) {
        avatarUrl = await this.toBase64(this.avatarFile);
      }
    } catch (readError) {
      const message =
        readError instanceof Error
          ? readError.message || 'Failed to read avatar file'
          : 'Failed to read avatar file';
      this.errorMessage.set(message);
      this.isSaving.set(false);
      return;
    }

    try {
      const updated = await firstValueFrom(
        this.backend.updateUser(currentUser.id, {
          username: this.username().trim(),
          email: this.email().trim(),
          avatarUrl: avatarUrl ?? undefined,
        })
      );

      this.user.set(updated);
      this.username.set(updated.username);
      this.email.set(updated.email);
      this.avatarPreview.set(updated.avatarUrl ?? null);
      this.avatarFile = null;
      this.successMessage.set('Profile updated successfully');
      this.auth.refreshCurrentUser();
    } catch (error) {
      let message = 'Failed to update profile';
      if (error instanceof Error && error.message) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      } else if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
      ) {
        message = (error as { message: string }).message;
      }
      this.errorMessage.set(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
