import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { CartState, Game, PurchaseSummary } from '../models';
import { MockBackendService } from './mock-backend.service';
import { AuthService } from './auth';

interface CartViewItem {
  game: Game;
}

export interface CartViewState {
  items: CartViewItem[];
  discountCode?: string;
  summary: PurchaseSummary;
}

const INITIAL_SUMMARY: PurchaseSummary = {
  totalBeforeDiscount: 0,
  discountPercentage: 0,
  discountAmount: 0,
  totalAfterDiscount: 0,
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'game-store-cart';
  private readonly state$ = new BehaviorSubject<CartState>({ userId: null, items: [] });

  readonly viewState$: Observable<CartViewState> = this.state$.pipe(
    map((state) => this.buildViewState(state))
  );

  constructor(
    private backend: MockBackendService,
    private auth: AuthService
  ) {
    this.restoreCart();
    this.auth.currentUser$.subscribe((user) => {
      if (!user) {
        this.state$.next({ userId: null, items: [] });
        return;
      }
      this.loadCartForUser(user.id);
    });
  }

  addGame(game: Game): void {
    const state = this.ensureUserState();
    if (state.items.some((item) => item.gameId === game.id)) {
      return;
    }
    const next: CartState = {
      ...state,
      items: [...state.items, { gameId: game.id, quantity: 1 }],
    };
    this.updateState(next);
  }

  removeGame(gameId: string): void {
    const state = this.ensureUserState();
    const next: CartState = {
      ...state,
      items: state.items.filter((item) => item.gameId !== gameId),
    };
    this.updateState(next);
  }

  clearCart(): void {
    const state = this.state$.value;
    if (!state.userId) {
      return;
    }
    this.updateState({ userId: state.userId, items: [], discountCode: undefined });
  }

  applyDiscount(code: string): Observable<void> {
    const state = this.ensureUserState();
    if (!code.trim()) {
      throw new Error('Discount code is required');
    }
    return this.backend.validateDiscountForUser(state.userId!, code).pipe(
      tap((discount) => {
        const next: CartState = { ...state, discountCode: discount.code };
        this.updateState(next);
      }),
      map(() => void 0)
    );
  }

  clearDiscount(): void {
    const state = this.ensureUserState();
    const next: CartState = { ...state, discountCode: undefined };
    this.updateState(next);
  }

  getCartSnapshot(): CartState {
    return this.state$.value;
  }

  private ensureUserState(): CartState {
    const state = this.state$.value;
    const user = this.auth.currentUserSnapshot;
    if (!user) {
      throw new Error('Please login first');
    }
    if (!state.userId) {
      this.loadCartForUser(user.id);
      return this.state$.value;
    }
    return state;
  }

  private buildViewState(state: CartState): CartViewState {
    if (!state.userId || !state.items.length) {
      return { items: [], discountCode: state.discountCode, summary: { ...INITIAL_SUMMARY } };
    }

    let items: CartViewItem[] = [];
    let summary: PurchaseSummary = { ...INITIAL_SUMMARY };

    const currentGames = this.backend.getGamesSnapshot();
    const selectedGames = currentGames.filter((game) =>
      state.items.some((item) => item.gameId === game.id)
    );
    items = selectedGames.map((game) => ({ game }));
    const totalBeforeDiscount = selectedGames.reduce((sum, game) => sum + game.price, 0);
    const discount = state.discountCode
      ? this.backend.getDiscountSnapshot(state.discountCode)
      : undefined;
    const discountPercentage = discount?.percentage ?? 0;
    const discountAmount = parseFloat(
      ((totalBeforeDiscount * discountPercentage) / 100).toFixed(2)
    );
    summary = {
      totalBeforeDiscount: parseFloat(totalBeforeDiscount.toFixed(2)),
      discountPercentage,
      discountAmount,
      totalAfterDiscount: parseFloat((totalBeforeDiscount - discountAmount).toFixed(2)),
    };

    return { items, discountCode: state.discountCode, summary };
  }

  private updateState(next: CartState): void {
    this.state$.next(next);
    if (next.userId) {
      this.persist(next.userId, next);
    }
  }

  private loadCartForUser(userId: string): void {
    const stored = this.storage?.getItem(`${this.storageKey}:${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CartState;
        this.state$.next({ ...parsed, userId });
        return;
      } catch (error) {
        console.warn('Failed to parse stored cart. Clearing.', error);
        this.storage?.removeItem(`${this.storageKey}:${userId}`);
      }
    }
    this.state$.next({ userId, items: [] });
  }

  private persist(userId: string, state: CartState): void {
    this.storage?.setItem(`${this.storageKey}:${userId}`, JSON.stringify(state));
  }

  private restoreCart(): void {
    const user = this.auth.currentUserSnapshot;
    if (user) {
      this.loadCartForUser(user.id);
    }
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
