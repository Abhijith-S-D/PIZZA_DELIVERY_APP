import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth-service.service';
import { Router } from '@angular/router';
import { MenuServiceService } from '../services/menu-service.service';
import { MenuData } from './menu.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  menu: Subject<MenuData> = new Subject();
  

  constructor(private authService: AuthService, private router: Router, private menuService: MenuServiceService) { }

  ngOnInit(): void {
    this.authService.isAuthenticated.subscribe((isAuthenticated)=>{
      if(!isAuthenticated){        
        this.router.navigate(['login']);
      }
    });
    this.menuService.menu.subscribe((menuData:MenuData)=>{
      this.menu.next(menuData);
    });
    this.menuService.getMenu();
  }

  addMenuToCart(menukey: string){
    this.menuService.addMenuToCart(+menukey);
  }

}
