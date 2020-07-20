import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth-service.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'pizzaui';
  isAuthenticated: boolean;
  authSubscription: Subscription;
  user: string;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.authSubscription = this.authService.isAuthenticated.subscribe(
      (isAuthenticated: boolean)=>{
        this.isAuthenticated=isAuthenticated;
      }
    );

    this.authService.user.subscribe(user => {
      this.user = user;
    });
  }

  logout(){
    this.authService.logout();
  }
}
