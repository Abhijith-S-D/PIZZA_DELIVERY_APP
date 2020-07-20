import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { UserData } from '../login/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  isAuthenticated: BehaviorSubject<boolean> = new BehaviorSubject(false);
  user: BehaviorSubject<string> = new BehaviorSubject('Guest');
  authErrorMsg: Subject<string> = new Subject();
  registerErrorMsg: Subject<string> = new Subject();
  userToken: string;
  userEmail: string;
  userData: Subject<UserData> = new Subject();
  tokenTimeout: NodeJS.Timeout;

  constructor(private http: HttpClient) { }

  headers: HttpHeaders = new HttpHeaders().set('Content-Type', 'application/json');

  login = (email: string, password: string) => {
    this.http.post("https://localhost:3001/tokens", { email: email, password: password }, { headers: this.headers }).subscribe(
      (response: any) => {
        this.userEmail = response.email;
        this.userToken = response.id;
        this.isAuthenticated.next(true);
        this.getUserData();
        this.tokenTimeout = setTimeout(this.extendToken, (response.expires - Date.now() - 5000));
      },
      (error) => {
        console.log(error.error.Error);
        this.authErrorMsg.next(error.error.Error);
        this.isAuthenticated.next(false);
      }
    );
  }

  extendToken = () => {
    this.http.put("https://localhost:3001/tokens", { id: this.userToken, extend: true }, { headers: this.headers }).subscribe(
      (response: any) => {
        console.log("extended");
        console.log(response);

        this.tokenTimeout = setTimeout(this.extendToken, (response.expires - Date.now() - 5000));
      },
      (error) => {
        console.log(error.error.Error);

      }
    );
  }

  getUserData = ()=>{
    this.http.get<UserData>("https://localhost:3001/users?email="+this.userEmail, { headers:{token:this.userToken} }).subscribe(
      (response: UserData) => {
        this.userData.next(response);
        this.user.next(response.name);
      },
      (error) => {
        console.log(error.error.Error);

      }
    );
  }

  updateUserData = (name: string, password: string, address: string) => {
    this.http.put("https://localhost:3001/users", { name: name, email: this.userEmail, password: password, address: address }, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('token',this.userToken) }).subscribe(
      (response: any) => {
        this.getUserData();
      },
      (error) => {
        console.log(error.error.Error);

      }
    );
  }

  deleteUserData = () => {
    this.http.delete("https://localhost:3001/users?email=" + this.userEmail,{headers:{token:this.userToken}}).subscribe(
      () => {
        this.isAuthenticated.next(false);
        this.user.next('Guest');
        this.userData.next(null);
        this.userEmail=null;
        this.userToken=null;
      },
      (error) => {

      }
    );
  }

  logout = () => {
    this.http.delete("https://localhost:3001/tokens?id=" + this.userToken).subscribe(
      () => {
        this.isAuthenticated.next(false);
        this.user.next('Guest');
        this.userData.next(null);
        this.userEmail=null;
        this.userToken=null;
      },
      (error) => {

      }
    );
  }

  register = (name: string, email: string, password: string, address: string) => {
    this.http.post("https://localhost:3001/users", { name: name, email: email, password: password, address: address }, { headers: this.headers }).subscribe(
      (response: any) => {
        this.login(email,password);
      },
      (error) => {
        console.log(error.error.Error);
        this.registerErrorMsg.next(error.error.Error);
        this.isAuthenticated.next(false);
      }
    );
  }

  checkAuthenticated(): boolean {
    return this.isAuthenticated.getValue();
  }
}
