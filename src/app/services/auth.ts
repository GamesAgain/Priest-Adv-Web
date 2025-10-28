import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models';
import { MockBackendService } from './mock-backend.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionKey = 'game-store-session-user-id';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private backend: MockBackendService) {
    this.restoreSession();
  }

  login(username: string, password: string): Observable<User> {
    return this.backend.login(username, password).pipe(tap((user) => this.setSession(user)));
  }

  register(
    payload: Parameters<MockBackendService['register']>[0]
  ): Observable<User> {
    return this.backend.register(payload).pipe(tap((user) => this.setSession(user)));
  }

  refreshCurrentUser(): void {
    const id = this.storage?.getItem(this.sessionKey);
    if (!id) {
      return;
    }
    this.backend.getUser(id).subscribe({
      next: (user) => this.currentUserSubject.next(user),
      error: () => this.clearSession(),
    });
  }

  logout(): void {
    this.clearSession();
  }

  get currentUserSnapshot(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  private restoreSession(): void {
    const id = this.storage?.getItem(this.sessionKey);
    if (!id) {
      return;
    }
    this.backend.getUser(id).subscribe({
      next: (user) => this.currentUserSubject.next(user),
      error: () => this.clearSession(),
    });
  }

  private setSession(user: User): void {
    this.currentUserSubject.next(user);
    this.storage?.setItem(this.sessionKey, user.id);
  }

  private clearSession(): void {
    this.storage?.removeItem(this.sessionKey);
    this.currentUserSubject.next(null);
  }

  private get storage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch (error) {
      console.warn('LocalStorage unavailable', error);
    }
    return null;
  }
}
