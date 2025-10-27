// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { HttpClient, HttpClientModule } from '@angular/common/http';
// import { RouterLink, RouterModule } from '@angular/router';
// import { HeaderAdmin } from '../header-admin/header-admin';

// @Component({
//   selector: 'app-addgame',
//   imports: [HeaderAdmin, CommonModule , HttpClientModule , FormsModule],
//   templateUrl: './addgame.html',
//   styleUrl: './addgame.scss'
// })
// export class Addgame {

// }
// New Code TS
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../header-admin/header-admin';

// Interface สำหรับข้อมูลเกม
interface Game {
  id?: number;
  name: string;
  price: number;
  category: string;
  releaseDate: string;
  description: string;
  posterImage?: string;
  illustrations?: string[];
}

@Component({
  selector: 'app-addgame',
  imports: [HeaderAdmin, CommonModule, HttpClientModule, FormsModule],
  templateUrl: './addgame.html',
  styleUrl: './addgame.scss'
})
export class Addgame implements OnInit {
  // API URL - ปรับตามที่คุณใช้งาน
  private apiUrl = 'http://localhost:3000/api/games';

  // ข้อมูลเกมที่กำลังจัดการ
  game: Game = {
    name: '',
    price: 0,
    category: '',
    releaseDate: '',
    description: '',
    posterImage: '',
    illustrations: []
  };

  // รายการเกมทั้งหมด
  games: Game[] = [];

  // ประเภทเกมที่กำหนดไว้
  gameCategories: string[] = [
    'Action',
    'Adventure',
    'RPG',
    'Strategy',
    'Sports',
    'Racing',
    'Simulation',
    'Puzzle'
  ];

  // ไฟล์รูปภาพที่อัปโหลด
  posterFile: File | null = null;
  illustrationFiles: File[] = [];

  // สำหรับค้นหา
  searchTerm: string = '';
  searchCategory: string = '';
  filteredGames: Game[] = [];

  // สถานะการแก้ไข
  isEditMode: boolean = false;
  editingGameId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // ตั้งค่าวันที่วางขายอัตโนมัติเป็นวันที่ปัจจุบัน
    this.setCurrentDate();
    // โหลดข้อมูลเกมทั้งหมด
    this.loadGames();
  }

  // ตั้งค่าวันที่ปัจจุบันอัตโนมัติ
  setCurrentDate(): void {
    const today = new Date();
    this.game.releaseDate = today.toISOString().split('T')[0];
  }

  // จัดการการเลือกไฟล์ Poster
  onPosterFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.posterFile = file;
      
      // แสดง Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.game.posterImage = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
    }
  }

  // จัดการการเลือกไฟล์ Illustrations (หลายไฟล์)
  onIllustrationFilesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        this.illustrationFiles.push(file);
        
        // แสดง Preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (!this.game.illustrations) {
            this.game.illustrations = [];
          }
          this.game.illustrations.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ลบรูป Illustration
  removeIllustration(index: number): void {
    this.illustrationFiles.splice(index, 1);
    this.game.illustrations?.splice(index, 1);
  }

  // โหลดข้อมูลเกมทั้งหมด (READ)
  loadGames(): void {
    this.http.get<Game[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.games = data;
        this.filteredGames = data;
      },
      error: (error) => {
        console.error('Error loading games:', error);
        alert('ไม่สามารถโหลดข้อมูลเกมได้');
      }
    });
  }

  // เพิ่มหรือแก้ไขเกม (CREATE / UPDATE)
  saveGame(): void {
    // ตรวจสอบข้อมูล
    if (!this.validateGameData()) {
      return;
    }

    const formData = new FormData();
    formData.append('name', this.game.name);
    formData.append('price', this.game.price.toString());
    formData.append('category', this.game.category);
    formData.append('releaseDate', this.game.releaseDate);
    formData.append('description', this.game.description);

    // เพิ่มไฟล์รูปภาพ
    if (this.posterFile) {
      formData.append('poster', this.posterFile);
    }

    this.illustrationFiles.forEach((file, index) => {
      formData.append(`illustration_${index}`, file);
    });

    if (this.isEditMode && this.editingGameId) {
      // แก้ไขเกม (UPDATE)
      this.http.put(`${this.apiUrl}/${this.editingGameId}`, formData).subscribe({
        next: (response) => {
          alert('แก้ไขข้อมูลเกมสำเร็จ!');
          this.resetForm();
          this.loadGames();
        },
        error: (error) => {
          console.error('Error updating game:', error);
          alert('ไม่สามารถแก้ไขข้อมูลเกมได้');
        }
      });
    } else {
      // เพิ่มเกมใหม่ (CREATE)
      this.http.post(this.apiUrl, formData).subscribe({
        next: (response) => {
          alert('เพิ่มเกมสำเร็จ!');
          this.resetForm();
          this.loadGames();
        },
        error: (error) => {
          console.error('Error adding game:', error);
          alert('ไม่สามารถเพิ่มเกมได้');
        }
      });
    }
  }

  // ตรวจสอบความถูกต้องของข้อมูล
  validateGameData(): boolean {
    if (!this.game.name.trim()) {
      alert('กรุณากรอกชื่อเกม');
      return false;
    }

    if (!this.game.price || this.game.price <= 0) {
      alert('กรุณากรอกราคาที่ถูกต้อง');
      return false;
    }

    if (!this.game.category) {
      alert('กรุณาเลือกประเภทเกม');
      return false;
    }

    if (!this.game.releaseDate) {
      alert('กรุณาเลือกวันที่วางขาย');
      return false;
    }

    if (!this.game.description.trim()) {
      alert('กรุณากรอกคำอธิบาย');
      return false;
    }

    if (!this.posterFile && !this.isEditMode) {
      alert('กรุณาอัปโหลดรูป Poster');
      return false;
    }

    return true;
  }

  // แก้ไขเกม (เตรียมข้อมูลสำหรับแก้ไข)
  editGame(game: Game): void {
    this.isEditMode = true;
    this.editingGameId = game.id || null;
    
    this.game = { ...game };
    
    // Scroll ไปที่ฟอร์ม
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ลบเกม (DELETE)
  deleteGame(id: number): void {
    if (confirm('คุณต้องการลบเกมนี้ใช่หรือไม่?')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          alert('ลบเกมสำเร็จ!');
          this.loadGames();
        },
        error: (error) => {
          console.error('Error deleting game:', error);
          alert('ไม่สามารถลบเกมได้');
        }
      });
    }
  }

  // ค้นหาเกม (ชื่อ/ประเภท)
  searchGames(): void {
    this.filteredGames = this.games.filter(game => {
      const matchName = game.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchCategory = !this.searchCategory || game.category === this.searchCategory;
      
      return matchName && matchCategory;
    });
  }

  // รีเซ็ตการค้นหา
  resetSearch(): void {
    this.searchTerm = '';
    this.searchCategory = '';
    this.filteredGames = [...this.games];
  }

  // รีเซ็ตฟอร์ม
  resetForm(): void {
    this.game = {
      name: '',
      price: 0,
      category: '',
      releaseDate: '',
      description: '',
      posterImage: '',
      illustrations: []
    };
    
    this.posterFile = null;
    this.illustrationFiles = [];
    this.isEditMode = false;
    this.editingGameId = null;
    
    // ตั้งค่าวันที่ใหม่
    this.setCurrentDate();
  }

  // ยกเลิกการแก้ไข
  cancelEdit(): void {
    this.resetForm();
  }
}
