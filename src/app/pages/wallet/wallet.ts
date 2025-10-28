import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { AuthService } from '../../services/auth';
import { MockBackendService } from '../../services/mock-backend.service';
import { Transaction, User } from '../../models';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, NgSwitch, NgSwitchCase, FormsModule, Header],
  templateUrl: './wallet.html',
  styleUrls: ['./wallet.scss'],
})
export class Wallet {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(MockBackendService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly topUpOptions = [100, 200, 300, 500, 1000, 5000];
  readonly selectedAmount = signal<number | null>(null);
  readonly customAmount = signal<number | null>(null);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly user = signal<User | null>(null);

  transactions: Transaction[] = [];

  constructor() {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      this.user.set(user);
      this.refreshTransactions();
    });
  }

  selectAmount(amount: number): void {
    this.selectedAmount.set(amount);
    this.customAmount.set(null);
  }

  onCustomAmountChange(value: string): void {
    const amount = Number(value);
    this.customAmount.set(!Number.isFinite(amount) ? null : amount);
    this.selectedAmount.set(null);
  }

  topUp(): void {
    const currentUser = this.user();
    if (!currentUser) {
      return;
    }

    const amount = this.selectedAmount() ?? this.customAmount() ?? 0;
    if (amount <= 0) {
      this.errorMessage.set('Please select or enter a valid amount');
      return;
    }

    this.backend.topUpWallet(currentUser.id, amount).subscribe({
      next: () => {
        this.successMessage.set(`Wallet topped up by ${amount.toFixed(2)} ฿`);
        this.errorMessage.set('');
        this.selectedAmount.set(null);
        this.customAmount.set(null);
        this.auth.refreshCurrentUser();
        this.refreshTransactions();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to top up');
        this.successMessage.set('');
      },
    });
  }

  private refreshTransactions(): void {
    const user = this.user();
    if (!user) {
      return;
    }
    this.backend.listTransactions(user.id).subscribe((transactions) => {
      this.transactions = transactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }
}
