import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule],
})
export class Register {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  avatarFile?: File;

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.avatarFile = input.files[0];
    }
  }

  async onRegister(): Promise<void> {
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const avatarUrl = this.avatarFile ? await this.toBase64(this.avatarFile) : undefined;
      this.auth
        .register({
          username: this.username,
          email: this.email,
          password: this.password,
          avatarUrl,
        })
        .subscribe({
          next: () => {
            this.loading.set(false);
            this.router.navigate(['/callapi']);
          },
          error: (error: Error) => {
            this.loading.set(false);
            this.errorMessage.set(error.message || 'Registration failed');
          },
        });
    } catch (error) {
      this.loading.set(false);
      this.errorMessage.set('Failed to read profile picture');
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
