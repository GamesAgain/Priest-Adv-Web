import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Header } from '../header/header';

@Component({
  selector: 'app-wallet',
  imports: [CommonModule, Header , HttpClientModule],
  templateUrl: './wallet.html',
  styleUrl: './wallet.scss'
})
export class Wallet {
  
}
