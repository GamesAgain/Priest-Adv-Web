import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { MockBackendService } from '../../services/mock-backend.service';
import { AuthService } from '../../services/auth';
import { CartService } from '../../services/cart.service';
import { CartViewState } from '../../services/cart.service';
import { Game, User } from '../../models';

@Component({
  selector: 'app-call-api',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './call-api.html',
  styleUrls: ['./call-api.scss'],
})
export class CallApi {
  private readonly backend = inject(MockBackendService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal('all');
  readonly discountInput = signal('');
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly user = signal<User | null>(null);

  readonly categories$ = this.backend.categories$;
  readonly bestSellers$ = this.backend.getTopSellers(5);
  readonly cartState$ = this.cart.viewState$;

  readonly games$ = combineLatest([
    this.backend.games$,
    toObservable(this.searchTerm),
    toObservable(this.selectedCategory),
    this.auth.currentUser$,
  ]).pipe(
    map(([games, term, category, user]) => {
      const normalizedTerm = term.trim().toLowerCase();
      return games
        .filter((game) => {
          const matchesTerm = !normalizedTerm || game.title.toLowerCase().includes(normalizedTerm);
          const matchesCategory = category === 'all' || game.category === category;
          return matchesTerm && matchesCategory;
        })
        .map((game) => ({
          ...game,
          isOwned: user?.ownedGames.includes(game.id) ?? false,
        }));
    })
  );

  constructor() {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.user.set(user);
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  clearFilters(): void {
    this.selectedCategory.set('all');
    this.searchTerm.set('');
  }

  addToCart(game: Game & { isOwned?: boolean }): void {
    const currentUser = this.auth.currentUserSnapshot;
    if (!currentUser) {
      this.router.navigate(['/']);
      return;
    }
    if (game.isOwned) {
      this.errorMessage.set('You already own this game');
      return;
    }
    this.cart.addGame(game);
    this.message.set(`${game.title} added to cart`);
    this.errorMessage.set('');
  }

  removeFromCart(gameId: string): void {
    this.cart.removeGame(gameId);
  }

  applyDiscount(): void {
    const code = this.discountInput().trim();
    const currentUser = this.auth.currentUserSnapshot;
    if (!currentUser) {
      this.router.navigate(['/']);
      return;
    }
    if (!code) {
      this.errorMessage.set('Please enter a discount code');
      return;
    }
    this.cart.applyDiscount(code).subscribe({
      next: () => {
        this.message.set(`Discount code ${code.toUpperCase()} applied`);
        this.errorMessage.set('');
        this.discountInput.set(code.toUpperCase());
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message || 'Failed to apply discount');
        this.message.set('');
      },
    });
  }

  clearDiscount(): void {
    this.cart.clearDiscount();
    this.discountInput.set('');
  }

  checkout(cartState: CartViewState): void {
    const currentUser = this.auth.currentUserSnapshot;
    if (!currentUser) {
      this.router.navigate(['/']);
      return;
    }
    if (!cartState.items.length) {
      this.errorMessage.set('Your cart is empty');
      return;
    }

    const gameIds = cartState.items.map((item) => item.game.id);
    this.backend
      .purchaseGames(currentUser.id, gameIds, cartState.discountCode)
      .subscribe({
        next: ({ summary }) => {
          this.message.set(
            `Purchase successful! Total ${summary.totalAfterDiscount.toFixed(2)} ฿` +
              (summary.discountPercentage
                ? ` (saved ${summary.discountAmount.toFixed(2)} ฿ with ${summary.discountPercentage}% off)`
                : '')
          );
          this.errorMessage.set('');
          this.cart.clearCart();
          this.discountInput.set('');
          this.auth.refreshCurrentUser();
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message || 'Failed to complete purchase');
          this.message.set('');
        },
      });
  }
}
