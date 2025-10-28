import { CommonModule, NgIf, NgFor, NgSwitch, NgSwitchCase } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { AuthService } from '../../services/auth';
import { MockBackendService } from '../../services/mock-backend.service';
import { Game, DiscountCode, Transaction, User } from '../../models';

interface GameForm {
  title: string;
  description: string;
  price: number;
  category: string;
  coverFile?: File | null;
}

interface DiscountForm {
  code: string;
  description: string;
  percentage: number;
  maxUses: number;
  perAccountLimit: number;
  expiresAt?: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, NgIf, NgFor, NgSwitch, NgSwitchCase],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(MockBackendService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = signal<User | null>(null);
  readonly games = signal<Game[]>([]);
  readonly discounts = signal<DiscountCode[]>([]);
  readonly transactions = signal<Transaction[]>([]);
  readonly users = signal<Record<string, User>>({});
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly categories$ = this.backend.categories$;

  gameForm: GameForm = this.createEmptyGameForm();
  editingGameId: string | null = null;

  discountForm: DiscountForm = this.createEmptyDiscountForm();
  editingDiscountId: string | null = null;

  constructor() {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user || user.role !== 'admin') {
        this.router.navigate(['/']);
        return;
      }
      this.currentUser.set(user);
      this.loadData();
    });

    this.backend.games$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((games) => {
      this.games.set(games);
    });

    this.backend.discountCodes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((discounts) => {
      this.discounts.set(discounts);
    });

    this.backend.listUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((users) => {
      const map: Record<string, User> = {};
      users.forEach((user) => {
        map[user.id] = user;
      });
      this.users.set(map);
    });
  }

  private loadData(): void {
    this.backend.listTransactions().subscribe((transactions) => {
      this.transactions.set(
        transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    });
  }

  async submitGame(): Promise<void> {
    if (!this.gameForm.title || !this.gameForm.description || !this.gameForm.price) {
      this.errorMessage.set('Please fill in all game fields');
      return;
    }

    try {
      const coverImage = this.gameForm.coverFile ? await this.toBase64(this.gameForm.coverFile) : undefined;
      const payload = {
        title: this.gameForm.title,
        description: this.gameForm.description,
        price: this.gameForm.price,
        category: this.gameForm.category,
        coverImage,
      };

      const action = this.editingGameId
        ? this.backend.updateGame(this.editingGameId, payload)
        : this.backend.createGame(payload);

      action.subscribe({
        next: () => {
          this.successMessage.set(this.editingGameId ? 'Game updated' : 'Game created');
          this.errorMessage.set('');
          this.resetGameForm();
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message || 'Failed to save game');
          this.successMessage.set('');
        },
      });
    } catch (error) {
      this.errorMessage.set('Failed to read cover image');
      this.successMessage.set('');
    }
  }

  editGame(game: Game): void {
    this.editingGameId = game.id;
    this.gameForm = {
      title: game.title,
      description: game.description,
      price: game.price,
      category: game.category,
      coverFile: null,
    };
  }

  deleteGame(gameId: string): void {
    if (!confirm('Delete this game?')) {
      return;
    }
    this.backend.deleteGame(gameId).subscribe({
      next: () => {
        this.successMessage.set('Game deleted');
        this.errorMessage.set('');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to delete game');
        this.successMessage.set('');
      },
    });
  }

  onGameFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.gameForm.coverFile = input.files?.[0] ?? null;
  }

  submitDiscount(): void {
    if (!this.discountForm.code || !this.discountForm.description) {
      this.errorMessage.set('Please fill in all discount fields');
      return;
    }

    const payload = {
      code: this.discountForm.code,
      description: this.discountForm.description,
      percentage: this.discountForm.percentage,
      maxUses: this.discountForm.maxUses,
      perAccountLimit: this.discountForm.perAccountLimit,
      expiresAt: this.discountForm.expiresAt || null,
    } as const;

    const action = this.editingDiscountId
      ? this.backend.updateDiscount(this.editingDiscountId, payload)
      : this.backend.createDiscount(payload);

    action.subscribe({
      next: () => {
        this.successMessage.set(this.editingDiscountId ? 'Discount updated' : 'Discount created');
        this.errorMessage.set('');
        this.resetDiscountForm();
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to save discount');
        this.successMessage.set('');
      },
    });
  }

  editDiscount(discount: DiscountCode): void {
    this.editingDiscountId = discount.id;
    this.discountForm = {
      code: discount.code,
      description: discount.description,
      percentage: discount.percentage,
      maxUses: discount.maxUses,
      perAccountLimit: discount.perAccountLimit,
      expiresAt: discount.expiresAt ? discount.expiresAt.slice(0, 10) : undefined,
    };
  }

  deleteDiscount(discountId: string): void {
    if (!confirm('Delete this discount code?')) {
      return;
    }
    this.backend.deleteDiscount(discountId).subscribe({
      next: () => {
        this.successMessage.set('Discount deleted');
        this.errorMessage.set('');
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to delete discount');
        this.successMessage.set('');
      },
    });
  }

  resetGameForm(): void {
    this.gameForm = this.createEmptyGameForm();
    this.editingGameId = null;
  }

  resetDiscountForm(): void {
    this.discountForm = this.createEmptyDiscountForm();
    this.editingDiscountId = null;
  }

  private createEmptyGameForm(): GameForm {
    return {
      title: '',
      description: '',
      price: 0,
      category: 'Action',
      coverFile: null,
    };
  }

  private createEmptyDiscountForm(): DiscountForm {
    return {
      code: '',
      description: '',
      percentage: 10,
      maxUses: 10,
      perAccountLimit: 1,
      expiresAt: undefined,
    };
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
