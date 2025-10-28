import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../header/header';
import { AuthService } from '../../services/auth';
import { MockBackendService } from '../../services/mock-backend.service';
import { Game, User } from '../../models';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './detail.html',
  styleUrls: ['./detail.scss'],
})
export class Detail {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(MockBackendService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<User | null>(null);
  readonly ownedGames = signal<Game[]>([]);
  readonly searchTerm = signal('');
  readonly selectedGame = signal<Game | null>(null);

  constructor() {
    this.auth.currentUser$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      this.user.set(user);
      this.refreshOwnedGames(user);
    });

    this.backend.games$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const user = this.user();
      if (user) {
        this.refreshOwnedGames(user);
      }
    });
  }

  get filteredGames(): Game[] {
    const term = this.searchTerm().trim().toLowerCase();
    return this.ownedGames().filter((game) =>
      !term || game.title.toLowerCase().includes(term) || game.category.toLowerCase().includes(term)
    );
  }

  viewGame(game: Game): void {
    this.selectedGame.set(game);
  }

  closeDetail(): void {
    this.selectedGame.set(null);
  }

  private refreshOwnedGames(user: User): void {
    const games = this.backend.getGamesSnapshot();
    this.ownedGames.set(games.filter((game) => user.ownedGames.includes(game.id)));
  }
}
