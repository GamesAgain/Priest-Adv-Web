import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, defer, delay, map } from 'rxjs';
import {
  DiscountCode,
  Game,
  PurchaseSummary,
  StoredUser,
  Transaction,
  User,
} from '../models';

interface BackendState {
  users: StoredUser[];
  games: Game[];
  discountCodes: DiscountCode[];
  transactions: Transaction[];
  categories: string[];
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
}

interface UpdateUserPayload {
  username?: string;
  email?: string;
  avatarUrl?: string | null;
}

interface GamePayload {
  title: string;
  description: string;
  price: number;
  category: string;
  coverImage?: string | null;
}

interface DiscountPayload {
  code: string;
  description: string;
  percentage: number;
  maxUses: number;
  perAccountLimit: number;
  expiresAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MockBackendService {
  private readonly storageKey = 'game-store-backend-v1';
  private readonly state$ = new BehaviorSubject<BackendState>(this.loadInitialState());

  readonly categories$ = this.state$.pipe(map((state) => state.categories));
  readonly games$ = this.state$.pipe(map((state) => state.games.map((g) => ({ ...g }))));
  readonly discountCodes$ = this.state$.pipe(map((state) => state.discountCodes.map((d) => ({ ...d }))));

  getGamesSnapshot(): Game[] {
    return this.state$.value.games.map((game) => ({ ...game }));
  }

  getDiscountSnapshot(code: string): DiscountCode | undefined {
    const discount = this.state$.value.discountCodes.find(
      (item) => item.code === code.trim().toUpperCase()
    );
    return discount ? { ...discount } : undefined;
  }

  login(username: string, password: string): Observable<User> {
    return this.simulateLatency(() => {
      const state = this.state$.value;
      const match = state.users.find(
        (user) =>
          user.username.toLowerCase() === username.trim().toLowerCase() &&
          user.password === password
      );

      if (!match) {
        throw new Error('Invalid username or password');
      }

      return this.stripSensitive(match);
    });
  }

  register(payload: RegisterPayload): Observable<User> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const username = payload.username.trim();
      const email = payload.email.trim().toLowerCase();

      if (!username || !email || !payload.password.trim()) {
        throw new Error('Please provide username, email and password');
      }

      if (state.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        throw new Error('Username already exists');
      }

      if (state.users.some((user) => user.email.toLowerCase() === email)) {
        throw new Error('Email already exists');
      }

      const newUser: StoredUser = {
        id: this.createId('usr'),
        username,
        email,
        password: payload.password,
        role: 'user',
        avatarUrl: payload.avatarUrl ?? undefined,
        walletBalance: 0,
        ownedGames: [],
        discountCodesUsed: [],
      };

      state.users.push(newUser);
      this.persist(state);

      return this.stripSensitive(newUser);
    });
  }

  getUser(userId: string): Observable<User> {
    return this.simulateLatency(() => {
      const user = this.state$.value.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      return this.stripSensitive(user);
    });
  }

  updateUser(userId: string, payload: UpdateUserPayload): Observable<User> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const user = state.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (payload.username) {
        const username = payload.username.trim();
        if (!username) {
          throw new Error('Username is required');
        }
        if (
          state.users.some(
            (u) => u.id !== userId && u.username.toLowerCase() === username.toLowerCase()
          )
        ) {
          throw new Error('Username already exists');
        }
        user.username = username;
      }

      if (payload.email) {
        const email = payload.email.trim().toLowerCase();
        if (!email) {
          throw new Error('Email is required');
        }
        if (state.users.some((u) => u.id !== userId && u.email.toLowerCase() === email)) {
          throw new Error('Email already exists');
        }
        user.email = email;
      }

      if (payload.avatarUrl !== undefined) {
        user.avatarUrl = payload.avatarUrl || undefined;
      }

      this.persist(state);
      return this.stripSensitive(user);
    });
  }

  listUsers(): Observable<User[]> {
    return this.simulateLatency(() => this.state$.value.users.map((u) => this.stripSensitive(u)));
  }

  createGame(payload: GamePayload): Observable<Game> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const title = payload.title.trim();
      if (!title) {
        throw new Error('Title is required');
      }
      if (payload.price <= 0) {
        throw new Error('Price must be greater than zero');
      }
      if (!state.categories.includes(payload.category)) {
        throw new Error('Invalid category');
      }

      const newGame: Game = {
        id: this.createId('game'),
        title,
        description: payload.description.trim(),
        price: Number(payload.price),
        category: payload.category,
        coverImage: payload.coverImage ?? undefined,
        releaseDate: new Date().toISOString(),
        totalSales: 0,
      };

      state.games.push(newGame);
      this.persist(state);
      return { ...newGame };
    });
  }

  updateGame(gameId: string, payload: GamePayload): Observable<Game> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const game = state.games.find((g) => g.id === gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      if (payload.title) {
        game.title = payload.title.trim();
      }
      if (payload.description) {
        game.description = payload.description.trim();
      }
      if (payload.price > 0) {
        game.price = Number(payload.price);
      }
      if (payload.category && state.categories.includes(payload.category)) {
        game.category = payload.category;
      }
      if (payload.coverImage !== undefined) {
        game.coverImage = payload.coverImage || undefined;
      }

      this.persist(state);
      return { ...game };
    });
  }

  deleteGame(gameId: string): Observable<void> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const index = state.games.findIndex((g) => g.id === gameId);
      if (index === -1) {
        throw new Error('Game not found');
      }

      state.games.splice(index, 1);
      state.users.forEach((user) => {
        user.ownedGames = user.ownedGames.filter((id) => id !== gameId);
      });
      this.persist(state);
    });
  }

  searchGames(term: string, category?: string): Observable<Game[]> {
    const normalizedTerm = term.trim().toLowerCase();
    return this.games$.pipe(
      map((games) =>
        games.filter((game) => {
          const matchesTerm = !normalizedTerm || game.title.toLowerCase().includes(normalizedTerm);
          const matchesCategory = !category || category === 'all' || game.category === category;
          return matchesTerm && matchesCategory;
        })
      )
    );
  }

  getGame(gameId: string): Observable<Game> {
    return this.simulateLatency(() => {
      const game = this.state$.value.games.find((g) => g.id === gameId);
      if (!game) {
        throw new Error('Game not found');
      }
      return { ...game };
    });
  }

  createDiscount(payload: DiscountPayload): Observable<DiscountCode> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const code = payload.code.trim().toUpperCase();
      if (!code) {
        throw new Error('Code is required');
      }
      if (payload.percentage <= 0 || payload.percentage > 100) {
        throw new Error('Percentage must be between 1 and 100');
      }
      if (payload.maxUses <= 0) {
        throw new Error('Max uses must be greater than zero');
      }
      if (payload.perAccountLimit <= 0) {
        throw new Error('Per account limit must be greater than zero');
      }
      if (state.discountCodes.some((d) => d.code === code)) {
        throw new Error('Code already exists');
      }

      const discount: DiscountCode = {
        id: this.createId('discount'),
        code,
        description: payload.description.trim(),
        percentage: Math.round(payload.percentage),
        maxUses: payload.maxUses,
        usedCount: 0,
        perAccountLimit: payload.perAccountLimit,
        expiresAt: payload.expiresAt || undefined,
      };

      state.discountCodes.push(discount);
      this.persist(state);
      return { ...discount };
    });
  }

  updateDiscount(discountId: string, payload: DiscountPayload): Observable<DiscountCode> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const discount = state.discountCodes.find((d) => d.id === discountId);
      if (!discount) {
        throw new Error('Discount not found');
      }

      if (payload.code) {
        const newCode = payload.code.trim().toUpperCase();
        if (state.discountCodes.some((d) => d.id !== discountId && d.code === newCode)) {
          throw new Error('Code already exists');
        }
        discount.code = newCode;
      }
      if (payload.description) {
        discount.description = payload.description.trim();
      }
      if (payload.percentage) {
        if (payload.percentage <= 0 || payload.percentage > 100) {
          throw new Error('Percentage must be between 1 and 100');
        }
        discount.percentage = Math.round(payload.percentage);
      }
      if (payload.maxUses) {
        if (payload.maxUses <= 0) {
          throw new Error('Max uses must be greater than zero');
        }
        discount.maxUses = payload.maxUses;
      }
      if (payload.perAccountLimit) {
        if (payload.perAccountLimit <= 0) {
          throw new Error('Per account limit must be greater than zero');
        }
        discount.perAccountLimit = payload.perAccountLimit;
      }
      if (payload.expiresAt !== undefined) {
        discount.expiresAt = payload.expiresAt || undefined;
      }

      this.persist(state);
      return { ...discount };
    });
  }

  deleteDiscount(discountId: string): Observable<void> {
    return this.simulateLatency(() => {
      const state = this.cloneState(this.state$.value);
      const index = state.discountCodes.findIndex((d) => d.id === discountId);
      if (index === -1) {
        throw new Error('Discount not found');
      }
      state.discountCodes.splice(index, 1);
      this.persist(state);
    });
  }

  validateDiscountForUser(userId: string, code: string): Observable<DiscountCode> {
    return this.simulateLatency(() => {
      const state = this.state$.value;
      const discount = state.discountCodes.find((d) => d.code === code.trim().toUpperCase());
      if (!discount) {
        throw new Error('Discount code not found');
      }
      if (discount.usedCount >= discount.maxUses) {
        throw new Error('Discount code has reached maximum usage');
      }
      if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
        throw new Error('Discount code expired');
      }

      const user = state.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const usedTimes = user.discountCodesUsed.filter((codeItem) => codeItem === discount.code).length;
      if (usedTimes >= discount.perAccountLimit) {
        throw new Error('You have already used this discount code the maximum times');
      }

      return { ...discount };
    });
  }

  topUpWallet(userId: string, amount: number): Observable<Transaction> {
    return this.simulateLatency(() => {
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      const state = this.cloneState(this.state$.value);
      const user = state.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.walletBalance = parseFloat((user.walletBalance + amount).toFixed(2));
      const transaction: Transaction = {
        id: this.createId('tx'),
        userId: user.id,
        type: 'topup',
        amount: parseFloat(amount.toFixed(2)),
        createdAt: new Date().toISOString(),
      };

      state.transactions.push(transaction);
      this.persist(state);
      return { ...transaction };
    });
  }

  purchaseGames(
    userId: string,
    gameIds: string[],
    discountCode?: string
  ): Observable<{ transaction: Transaction; summary: PurchaseSummary; ownedGames: string[] }> {
    return this.simulateLatency(() => {
      if (!gameIds.length) {
        throw new Error('No games selected');
      }
      const state = this.cloneState(this.state$.value);
      const user = state.users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const uniqueGameIds = Array.from(new Set(gameIds));
      const games = uniqueGameIds.map((id) => {
        const game = state.games.find((g) => g.id === id);
        if (!game) {
          throw new Error('Game not found');
        }
        if (user.ownedGames.includes(id)) {
          throw new Error('One or more games already owned');
        }
        return game;
      });

      const totalBeforeDiscount = games.reduce((sum, game) => sum + game.price, 0);
      let discountPercentage = 0;

      if (discountCode) {
        const discount = this.validateDiscountSync(user, state, discountCode);
        discountPercentage = discount.percentage;
        discount.usedCount += 1;
        user.discountCodesUsed.push(discount.code);
      }

      const discountAmount = parseFloat(
        ((totalBeforeDiscount * discountPercentage) / 100).toFixed(2)
      );
      const totalAfterDiscount = parseFloat((totalBeforeDiscount - discountAmount).toFixed(2));

      if (totalAfterDiscount > user.walletBalance) {
        throw new Error('Insufficient wallet balance');
      }

      user.walletBalance = parseFloat((user.walletBalance - totalAfterDiscount).toFixed(2));
      user.ownedGames = [...user.ownedGames, ...uniqueGameIds];

      games.forEach((game) => {
        game.totalSales += 1;
      });

      const transaction: Transaction = {
        id: this.createId('tx'),
        userId: user.id,
        type: 'purchase',
        amount: totalAfterDiscount,
        createdAt: new Date().toISOString(),
        details: {
          gameIds: uniqueGameIds,
          discountCode: discountCode?.toUpperCase(),
        },
      };

      state.transactions.push(transaction);
      this.persist(state);

      return {
        transaction: { ...transaction },
        summary: {
          totalBeforeDiscount: parseFloat(totalBeforeDiscount.toFixed(2)),
          discountPercentage,
          discountAmount,
          totalAfterDiscount,
        },
        ownedGames: [...user.ownedGames],
      };
    });
  }

  listTransactions(userId?: string): Observable<Transaction[]> {
    return this.simulateLatency(() => {
      const transactions = this.state$.value.transactions.filter(
        (tx) => !userId || tx.userId === userId
      );
      return transactions.map((tx) => ({ ...tx, details: tx.details ? { ...tx.details } : undefined }));
    });
  }

  getTopSellers(limit = 5): Observable<Game[]> {
    return this.games$.pipe(
      map((games) =>
        [...games]
          .sort((a, b) => b.totalSales - a.totalSales)
          .slice(0, limit)
      )
    );
  }

  resetAll(): void {
    const state = this.createDefaultState();
    this.persist(state);
  }

  private validateDiscountSync(user: StoredUser, state: BackendState, code: string): DiscountCode {
    const discount = state.discountCodes.find((d) => d.code === code.trim().toUpperCase());
    if (!discount) {
      throw new Error('Discount code not found');
    }
    if (discount.usedCount >= discount.maxUses) {
      throw new Error('Discount code has reached maximum usage');
    }
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      throw new Error('Discount code expired');
    }
    const usedTimes = user.discountCodesUsed.filter((codeItem) => codeItem === discount.code).length;
    if (usedTimes >= discount.perAccountLimit) {
      throw new Error('You have already used this discount code the maximum times');
    }
    return discount;
  }

  private stripSensitive(user: StoredUser): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return { ...safeUser };
  }

  private simulateLatency<T>(fn: () => T): Observable<T> {
    return defer(() => {
      try {
        const result = fn();
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    }).pipe(delay(200));
  }

  private createId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  }

  private cloneState(state: BackendState): BackendState {
    return {
      ...state,
      users: state.users.map((user) => ({
        ...user,
        ownedGames: [...user.ownedGames],
        discountCodesUsed: [...user.discountCodesUsed],
      })),
      games: state.games.map((game) => ({ ...game })),
      discountCodes: state.discountCodes.map((discount) => ({ ...discount })),
      transactions: state.transactions.map((tx) => ({
        ...tx,
        details: tx.details ? { ...tx.details, gameIds: tx.details.gameIds ? [...tx.details.gameIds] : undefined } : undefined,
      })),
      categories: [...state.categories],
    };
  }

  private persist(state: BackendState): void {
    this.state$.next(state);
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  private loadInitialState(): BackendState {
    const storage = this.getStorage();
    if (storage) {
      const raw = storage.getItem(this.storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as BackendState;
          return {
            ...this.createDefaultState(),
            ...parsed,
            categories: parsed.categories?.length ? parsed.categories : this.createDefaultState().categories,
          };
        } catch (error) {
          console.warn('Failed to parse persisted backend state. Using defaults.', error);
        }
      }
    }
    const defaults = this.createDefaultState();
    if (storage) {
      storage.setItem(this.storageKey, JSON.stringify(defaults));
    }
    return defaults;
  }

  private createDefaultState(): BackendState {
    const categories = ['Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports', 'Indie'];
    const games: Game[] = [
      {
        id: 'game_mhw',
        title: 'Monster Hunter Wilds',
        description: 'Hunt gigantic monsters and craft epic gear in vibrant open areas.',
        price: 2590,
        category: 'Action',
        releaseDate: '2025-02-28T00:00:00.000Z',
        totalSales: 4,
      },
      {
        id: 'game_cod6',
        title: 'Call of Duty: Black Ops 6',
        description: 'Tactical first person shooter with cinematic campaign and multiplayer.',
        price: 2441,
        category: 'Action',
        releaseDate: '2024-10-25T00:00:00.000Z',
        totalSales: 3,
      },
      {
        id: 'game_eafc25',
        title: 'EA Sports FC 25',
        description: 'Authentic football simulation featuring global leagues and clubs.',
        price: 1120,
        category: 'Sports',
        releaseDate: '2024-09-27T00:00:00.000Z',
        totalSales: 5,
      },
      {
        id: 'game_dyinglight',
        title: 'Dying Light: The Beast',
        description: 'Survive the night against ferocious infected with parkour combat.',
        price: 2099,
        category: 'Adventure',
        releaseDate: '2025-09-18T00:00:00.000Z',
        totalSales: 2,
      },
      {
        id: 'game_lnight3',
        title: 'Little Nightmares III',
        description: 'Cooperative puzzle horror adventure in a dark whimsical world.',
        price: 1189.47,
        category: 'Adventure',
        releaseDate: '2025-10-10T00:00:00.000Z',
        totalSales: 1,
      },
      {
        id: 'game_simcity',
        title: 'SimCity Skylines',
        description: 'Build and manage your dream metropolis with deep simulation systems.',
        price: 799,
        category: 'Simulation',
        releaseDate: '2023-11-10T00:00:00.000Z',
        totalSales: 8,
      },
      {
        id: 'game_starfield',
        title: 'Starfield',
        description: 'Explore a vast universe filled with factions, quests and mysteries.',
        price: 2290,
        category: 'RPG',
        releaseDate: '2023-09-06T00:00:00.000Z',
        totalSales: 6,
      },
      {
        id: 'game_bal',
        title: 'Baldur\'s Gate 3',
        description: 'Dungeons & Dragons storytelling with tactical combat and rich choices.',
        price: 1899,
        category: 'RPG',
        releaseDate: '2023-08-03T00:00:00.000Z',
        totalSales: 10,
      },
      {
        id: 'game_cities',
        title: 'Cities in Motion',
        description: 'Master public transportation networks across iconic cities.',
        price: 650,
        category: 'Strategy',
        releaseDate: '2022-05-11T00:00:00.000Z',
        totalSales: 7,
      },
      {
        id: 'game_stardew',
        title: 'Stardew Valley',
        description: 'Charming farming and life simulation with relaxing gameplay.',
        price: 450,
        category: 'Indie',
        releaseDate: '2016-02-26T00:00:00.000Z',
        totalSales: 15,
      },
    ];

    const admin: StoredUser = {
      id: 'admin_root',
      username: 'admin',
      email: 'admin@gamestore.dev',
      password: 'admin123',
      role: 'admin',
      walletBalance: 10000,
      ownedGames: games.slice(0, 2).map((g) => g.id),
      discountCodesUsed: [],
      avatarUrl: undefined,
    };

    const demoUser: StoredUser = {
      id: 'user_demo',
      username: 'demo',
      email: 'demo@gamestore.dev',
      password: 'demo123',
      role: 'user',
      walletBalance: 500,
      ownedGames: [games[2].id, games[9].id],
      discountCodesUsed: ['WELCOME10'],
      avatarUrl: undefined,
    };

    const discountCodes: DiscountCode[] = [
      {
        id: 'discount_welcome',
        code: 'WELCOME10',
        description: '10% off for your first purchase',
        percentage: 10,
        maxUses: 100,
        usedCount: 1,
        perAccountLimit: 1,
        expiresAt: undefined,
      },
      {
        id: 'discount_flash',
        code: 'FLASH25',
        description: 'Limited time 25% discount for RPG titles',
        percentage: 25,
        maxUses: 20,
        usedCount: 0,
        perAccountLimit: 1,
        expiresAt: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
      },
      {
        id: 'discount_bigspend',
        code: 'BIGSPENDER',
        description: '15% off orders above 2000฿',
        percentage: 15,
        maxUses: 50,
        usedCount: 0,
        perAccountLimit: 2,
        expiresAt: undefined,
      },
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx_seed1',
        userId: demoUser.id,
        type: 'topup',
        amount: 1000,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(),
      },
      {
        id: 'tx_seed2',
        userId: demoUser.id,
        type: 'purchase',
        amount: 450,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString(),
        details: {
          gameIds: [games[9].id],
          discountCode: 'WELCOME10',
        },
      },
    ];

    return {
      users: [admin, demoUser],
      games,
      discountCodes,
      transactions,
      categories,
    };
  }

  private getStorage(): Storage | null {
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
