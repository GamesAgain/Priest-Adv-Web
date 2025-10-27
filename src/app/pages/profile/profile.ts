import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  user: any = null;               // เก็บข้อมูลผู้ใช้
  showPopup: boolean = false;     // ควบคุม popup แสดง/ซ่อน
  newUsername: string = '';       // ค่า username ใหม่
  selectedFile: File | null = null; // ไฟล์รูปใหม่ (avatar)
  apiUrl = 'http://localhost:3000/users/update'; // ✅ API ของคุณ

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUser();
  }

  // โหลดข้อมูลผู้ใช้จาก localStorage
  loadUser() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
      console.log('✅ Loaded user:', this.user);
    } else {
      console.warn('⚠️ No user data found in localStorage');
    }
  }

  // เปิด popup แก้ไข
  openEditPopup() {
    this.showPopup = true;
    this.newUsername = this.user?.username || '';
  }

  // ปิด popup
  closeEditPopup() {
    this.showPopup = false;
    this.newUsername = '';
    this.selectedFile = null;
  }

  // เมื่อเลือกไฟล์จาก input
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      console.log('📸 Selected file:', file.name);
    }
  }

  // กดบันทึกข้อมูลใหม่
  onSubmit() {
    if (!this.user?.uid) {
      alert('❌ ไม่พบ user_id');
      return;
    }

    const formData = new FormData();
    formData.append('uid', this.user.uid);          // user_id เดิมจาก localStorage
    formData.append('username', this.newUsername);      // ชื่อใหม่
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);     // รูปใหม่
    }

    console.log('📤 Sending formData...', this.apiUrl);

    // เรียก API POST
    this.http.post(this.apiUrl, formData).subscribe({
      next: (res: any) => {
        console.log('✅ Update response:', res);

        if (res?.user) {
          // อัปเดตข้อมูลใน localStorage
          localStorage.setItem('user', JSON.stringify(res.user));
          this.user = res.user;

          alert('✅ อัปเดตข้อมูลสำเร็จ!');
          this.closeEditPopup();
        } else {
          alert('⚠️ อัปเดตเสร็จแต่ไม่พบข้อมูลผู้ใช้ใน response');
        }
      },
      error: (err) => {
        console.error('❌ Update error:', err);
        alert('❌ ไม่สามารถอัปเดตข้อมูลได้');
      },
    });
  }
}
