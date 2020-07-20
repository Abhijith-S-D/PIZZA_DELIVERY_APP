import { Component, OnInit } from '@angular/core';
import { CartData } from './cart.model';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';
import { CartServiceService } from '../services/cart-service.service';
import { MenuServiceService } from '../services/menu-service.service';
import {MatDialog} from '@angular/material/dialog';
import { OrderDialogComponent } from '../order-dialog/order-dialog.component';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {

  cart: BehaviorSubject <CartData> = new BehaviorSubject({items:[]});
  placingOrder:boolean = false;

  constructor(private authService: AuthService, private router: Router,private cartService: CartServiceService,public menuService: MenuServiceService, public dialog: MatDialog) { }

  ngOnInit(): void {
    this.authService.isAuthenticated.subscribe((isAuthenticated)=>{
      if(!isAuthenticated){        
        this.router.navigate(['login']);
      }
    });
    this.cartService.cart.subscribe((cartData:CartData)=>{
      this.cart.next(cartData);
    });
    this.cartService.placing.subscribe(placing=>{
      this.placingOrder=placing;
    });
    this.cartService.orderPlaced.subscribe(orderPlaced=>{
      if(orderPlaced){
        this.openDialog('Order Placed :)');
      }else{
        this.openDialog(this.cartService.orderPlacingErrMsg);
      }
    });
    this.cartService.getCartData();
  }

  updateCartItem = (menuKey:number,quantity:number,id:string)=>{
    this.cartService.updateCartItem(menuKey,quantity,id);
  }

  deleteCartItem = (id:string)=>{
    this.cartService.deleteCartItem(id);
  }

  placeOrder(){
    this.cartService.placeOrder();
  }

  openDialog(data: string) {
    if(this.dialog.openDialogs.length===0){
      const dialogRef = this.dialog.open(OrderDialogComponent, {
        data: data
      });
      console.log(data);
      dialogRef.afterClosed().subscribe(result => {
        this.router.navigate(['menu']);
      });
    }
    
  }

}
