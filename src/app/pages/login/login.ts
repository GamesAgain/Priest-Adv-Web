import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  username = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  onLogin(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(this.username, this.password).subscribe({
      next: (user) => {
        this.loading.set(false);
        if (user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/callapi']);
        }
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'Login failed');
      },
    });
  }
}
