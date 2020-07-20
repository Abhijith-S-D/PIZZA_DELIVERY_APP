import { Injectable } from '@angular/core';
import { AuthService } from './auth-service.service';
import { HttpClient } from '@angular/common/http';
import {  Subject } from 'rxjs';
import { MenuData } from '../menu/menu.model';
import { CartServiceService } from './cart-service.service';

@Injectable({
  providedIn: 'root'
})
export class MenuServiceService {

  menu: Subject<MenuData> = new Subject();
  menuData: MenuData;
  constructor(private http: HttpClient,private authService: AuthService, private cartService: CartServiceService) {}

  getMenu = () => {
    this.http.get<MenuData>("https://localhost:3001/menus?email="+this.authService.userEmail, { headers:{token:this.authService.userToken} }).subscribe(
      (menuData: MenuData) => {
        this.menu.next(menuData);
        this.menuData=menuData;
        this.cartService.getCartData();
      },
      (error) => {
        console.log(error.error.Error);

      }
    );
  }
  addMenuToCart=(menukey: number)=>{
    let cartItem = this.cartService.getCartItemForGivenMenuId(menukey);
    if(cartItem){
      this.http.put("https://localhost:3001/carts", { menuId:menukey, quantity:(cartItem.quantity+1), id: cartItem.id }, { headers: {'Content-Type':'application/json',token:this.authService.userToken} }).subscribe(
      (response: any) => {
        this.authService.getUserData();
        this.cartService.getCartData();
      },
      (error) => {
        console.log(error.error.Error);
      }
    );
    }else{
      this.http.post("https://localhost:3001/carts", { menuId:menukey, quantity:1, email: this.authService.userEmail }, { headers: {'Content-Type':'application/json',token:this.authService.userToken} }).subscribe(
      (response: any) => {
        this.authService.getUserData();
        this.cartService.getCartData();
      },
      (error) => {
        console.log(error.error.Error);
      }
    );
    }
  }

}
