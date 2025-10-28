import { Routes } from '@angular/router';
import { CallApi }  from './pages/call-api/call-api';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { Admin } from './pages/admin/admin';
import { Wallet } from './pages/wallet/wallet';
import { Detail } from './pages/detail/detail';

export const routes: Routes = [
    {path: '', component: Login},
    {path: 'login', component: Login},
    {path: 'callapi', component: CallApi },
    {path: 'profile/:id', component: Profile},
    {path: 'register', component: Register},
    {path: 'admin', component: Admin},
    {path: 'wallet', component: Wallet},
    {path: 'library', component: Detail},

];
