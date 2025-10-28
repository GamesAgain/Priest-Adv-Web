import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
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
    if (!currentUser) {
      return;
    }

    try {
      const avatarUrl = this.avatarFile ? await this.toBase64(this.avatarFile) : currentUser.avatarUrl;
      this.backend
        .updateUser(currentUser.id, {
          username: this.username(),
          email: this.email(),
          avatarUrl: avatarUrl ?? undefined,
        })
        .subscribe({
          next: (updated) => {
            this.successMessage.set('Profile updated successfully');
            this.errorMessage.set('');
            this.avatarFile = null;
            this.avatarPreview.set(updated.avatarUrl ?? null);
            this.auth.refreshCurrentUser();
          },
          error: (error: Error) => {
            this.errorMessage.set(error.message || 'Failed to update profile');
            this.successMessage.set('');
          },
        });
    } catch (error) {
      this.errorMessage.set('Failed to read avatar file');
      this.successMessage.set('');
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
