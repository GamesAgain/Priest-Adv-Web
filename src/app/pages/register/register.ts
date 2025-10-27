import { Component, inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
  imports: [CommonModule, FormsModule, HttpClientModule],
})
export class Register {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  birthday = '';
  avatarFile?: File;
  successMessage = '';
  errorMessage = '';
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor(private http: HttpClient) {}

  // เลือกรูปจาก <input type="file">
  onFileSelected(event: any) {
    this.avatarFile = event.target.files[0];
  }

  // สมัครสมาชิก
  onRegister() {
    if (this.password !== this.confirmPassword) {
      this.errorMessage = '❌ Passwords do not match';
      this.successMessage = '';
      return;
    }

    const formData = new FormData();
    formData.append('username', this.username);
    formData.append('email', this.email);
    formData.append('password', this.password);
    if (this.avatarFile) formData.append('avatar', this.avatarFile);

    this.http.post('http://localhost:3000/register/user', formData).subscribe({
      next: (res: any) => {
        console.log('✅ Register success:', res);
        this.successMessage = 'Register successful!';
        this.errorMessage = '';
        this.router.navigate(['callapi']);
      },
      error: (err) => {
        console.error('❌ Register failed:', err);
        this.errorMessage = err?.error?.message || 'Register failed!';
        this.successMessage = '';
      },
    });
  }
}
