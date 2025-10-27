import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Header } from '../header/header';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-update-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, HttpClientModule],
  templateUrl: './update-profile.html',
  styleUrls: ['./update-profile.scss']
})
export class UpdateProfile implements OnInit {
  user: any = null;
  newUsername: string = '';
  selectedFile: File | null = null;
  previewImage: string | null = null;
  apiUrl = 'http://localhost:3000/users/update'; // ✅ เส้น API จริง

  constructor(private http: HttpClient , private router: Router, private location: Location) {}

  ngOnInit() {
    this.loadUser();
  }

  /** โหลดข้อมูลผู้ใช้จาก localStorage */
  loadUser() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      this.newUsername = this.user?.username || '';
      console.log('✅ Loaded user:', this.user);
    } else {
      console.warn('⚠️ No user data found in localStorage');
    }
  }

  /** เมื่อเลือกรูปใหม่ */
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // แสดง preview รูปทันที
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /** กดปุ่มยืนยัน -> ส่งข้อมูลไป backend */
  onSubmit() {
    if (!this.user?.uid) {
      alert('❌ ไม่พบ user_id');
      return;
    }

    // ✅ เตรียมข้อมูลส่งไป backend
    const formData = new FormData();
    formData.append('uid', this.user.uid.toString());  // ส่ง ID ไปด้วย
    formData.append('username', this.newUsername);
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
    }

    console.log('📤 ส่งข้อมูล FormData ไปยัง API:', this.apiUrl);

    this.http.post(this.apiUrl, formData).subscribe({
      next: (res: any) => {
        console.log('✅ Update response:', res);

        if (res?.user) {
          // ✅ อัปเดตข้อมูลใน localStorage
          localStorage.setItem('user', JSON.stringify(res.user));
          this.user = res.user;
          alert('✅ อัปเดตข้อมูลสำเร็จ!');
          this.location.back()
        } else {
          alert('⚠️ API ตอบกลับไม่พบข้อมูลผู้ใช้');
        }
      },
      error: (err) => {
        console.error('❌ Update error:', err);
        alert('❌ ไม่สามารถอัปเดตข้อมูลได้');
      },
    });
  }
}
