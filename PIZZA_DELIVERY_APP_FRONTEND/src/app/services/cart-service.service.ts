import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth-service.service';
import { CartData } from '../cart/cart.model';
import { Subject, BehaviorSubject } from 'rxjs';
import { CartItemData } from '../cart/cartItem.model';

@Injectable({
  providedIn: 'root'
})
export class CartServiceService {

  cart: Subject<CartData> = new Subject();
  cartData: CartData;
  placing:BehaviorSubject<boolean> = new BehaviorSubject(false);
  orderPlaced: Subject<boolean> = new Subject();
  orderPlacingErrMsg: string;

  constructor(private http: HttpClient,private authService: AuthService) { }

  getCartItemForGivenMenuId = (menuId:number):CartItemData => {
    let cartItem = this.cartData.items.filter((cartItem)=>{
      if(cartItem.menuId===menuId){
        return true;
      }
      return false;
    });
    return cartItem.length !== 0 ? cartItem[0] : null;
  }

  getCartData= () => {
    this.http.get<CartData>("https://localhost:3001/carts?email="+this.authService.userEmail, { headers:{token:this.authService.userToken} }).subscribe(
      (response: CartData) => {
        this.cart.next(response);
        this.cartData = response;
      },
      (error) => {
        console.log(error.error.Error);

      }
    );
  }

  updateCartItem = (menuKey:number,quantity:number,id:string) => {
    this.http.put("https://localhost:3001/carts", { menuId:menuKey, quantity:quantity, id: id }, { headers: {'Content-Type':'application/json',token:this.authService.userToken} }).subscribe(
      (response: any) => {
        this.authService.getUserData();
        this.getCartData();
      },
      (error) => {
        console.log(error.error.Error);
      });
  }

  deleteCartItem = (id:string) => {
    this.http.delete("https://localhost:3001/carts?id="+id, { headers: {token:this.authService.userToken} }).subscribe(
      (response: any) => {
        this.authService.getUserData();
        this.getCartData();
      },
      (error) => {
        console.log(error.error.Error);
      });
  }

  placeOrder(){
    this.placing.next(true);
    this.http.post("https://localhost:3001/orders", { email:this.authService.userEmail, cc:'tok_visa' }, { headers: {'Content-Type':'application/json',token:this.authService.userToken} }).subscribe(
      (response: any) => {
        this.placing.next(false);
        this.orderPlaced.next(true);
        this.authService.getUserData();
        this.getCartData();
      },
      (error) => {
        console.log(error.error.Error);
        this.orderPlacingErrMsg = error.error.Error;
        this.placing.next(false);
        this.orderPlaced.next(false);
      });
  }

}
