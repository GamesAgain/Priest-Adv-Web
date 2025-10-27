import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
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
