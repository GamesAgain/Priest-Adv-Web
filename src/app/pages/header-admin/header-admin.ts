import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header-admin',
  imports: [RouterLink, RouterModule, CommonModule],
  templateUrl: './header-admin.html',
  styleUrl: './header-admin.scss'
})
export class HeaderAdmin {
  user: any = null; // ตัวแปรสำหรับเก็บข้อมูลผู้ใช้

  ngOnInit() {
    this.loadUser(); // เรียกใช้งานฟังก์ชันเมื่อ Component ถูกสร้าง
  }

  loadUser() {
    const userData = localStorage.getItem('user'); // ดึงข้อมูลจาก localStorage
    if (userData) {
      this.user = JSON.parse(userData); // แปลงข้อมูลจาก JSON เป็น Object
      console.log(userData);
      
    }
  }
}
