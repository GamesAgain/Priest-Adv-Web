import { Routes } from '@angular/router';
import { CallApi }  from './pages/call-api/call-api';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { UpdateProfile } from './pages/update-profile/update-profile';
import { Admin } from './pages/admin/admin';
import { Wallet } from './pages/wallet/wallet';
import { Addgame } from './pages/addgame/addgame';
import { Editgame } from './pages/editgame/editgame';

export const routes: Routes = [
    {path: '', component: Login},
    {path: 'callapi', component: CallApi },
    {path: 'profile/:id', component: Profile},
    {path: 'register', component: Register},
    {path: 'update/:id', component: UpdateProfile},
    {path: 'admin', component: Admin},
    {path: 'wallet', component: Wallet},
    {path: 'addgame', component: Addgame},
    {path: 'editgame', component: Editgame},
    
];
