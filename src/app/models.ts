export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  walletBalance: number;
  ownedGames: string[];
  discountCodesUsed: string[];
}

export interface StoredUser extends User {
  password: string;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  releaseDate: string;
  coverImage?: string;
  totalSales: number;
}

export type TransactionType = 'topup' | 'purchase';

export interface TransactionDetails {
  gameIds?: string[];
  discountCode?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  createdAt: string;
  details?: TransactionDetails;
}

export interface DiscountCode {
  id: string;
  code: string;
  description: string;
  percentage: number;
  maxUses: number;
  usedCount: number;
  perAccountLimit: number;
  expiresAt?: string;
}

export interface CartItem {
  gameId: string;
  quantity: number;
}

export interface CartState {
  userId: string | null;
  items: CartItem[];
  discountCode?: string;
}

export interface PurchaseSummary {
  totalBeforeDiscount: number;
  discountPercentage: number;
  discountAmount: number;
  totalAfterDiscount: number;
}
