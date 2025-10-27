import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink, RouterModule } from '@angular/router';
import { HeaderAdmin } from '../header-admin/header-admin';

@Component({
  selector: 'app-editgame',
  imports: [HeaderAdmin, CommonModule, HttpClientModule, FormsModule],
  templateUrl: './editgame.html',
  styleUrl: './editgame.scss'
})
export class Editgame {

}
