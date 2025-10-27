import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderAdmin } from '../header-admin/header-admin';
import { HttpClientModule , HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-admin',
  imports: [CommonModule , HeaderAdmin , HttpClientModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin {
  constructor( private http: HttpClient) {}
}
