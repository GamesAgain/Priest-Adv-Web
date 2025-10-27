import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule],
  templateUrl: './login.html',  // เส้นทางไฟล์ HTML
  styleUrls: ['./login.scss'],   // เส้นทางไฟล์ CSS
})
export class Login {
  username: string = '';         // ตัวแปรสำหรับเก็บชื่อผู้ใช้
  password: string = '';         // ตัวแปรสำหรับเก็บรหัสผ่าน
  errorMessage: string = '';     // ตัวแปรสำหรับเก็บข้อความผิดพลาด
  successMessage: string = '';   // ตัวแปรสำหรับเก็บข้อความสำเร็จ

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onLogin() {
    const payload = {
      username: this.username,     // สร้าง payload สำหรับการล็อกอิน
      password: this.password,

    };

    this.http.post('http://localhost:3000/login', payload).subscribe({
      next: (res: any) => {
        console.log('✅ Login success:', res);
        this.successMessage = 'Login successful!';
        this.errorMessage = '';
        // เก็บข้อมูลผู้ใช้ใน localStorage
        localStorage.setItem('user', JSON.stringify(res.user));
        if (res.user.role === 'admin') {
          this.router.navigate(['admin']);
        }
        else {
          this.router.navigate(['callapi']);
        }
      },
      error: (err) => {
        console.error('❌ Login failed:', err);
        this.errorMessage = err?.error?.message || 'Login failed!';
        this.successMessage = '';
      },
    });
  }
}