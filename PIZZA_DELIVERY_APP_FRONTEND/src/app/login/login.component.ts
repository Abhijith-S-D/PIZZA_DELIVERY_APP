import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemePalette } from '@angular/material/core';
import { AuthService } from '../services/auth-service.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup;
  registerForm: FormGroup;
  public loginInvalid: boolean;
  public registerInvalid: boolean;
  errorMessage: string;
  registerErrorMessage: string;
  color: ThemePalette = 'accent';
  checked = false;
  disabled = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {


    this.loginForm = this.fb.group({
      email: ['', Validators.email],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.email],
      password: ['', Validators.required],
      address: ['', Validators.required]
    });
    this.authService.isAuthenticated.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigate(['menu']);
      }
    });
    this.authService.authErrorMsg.subscribe(errorMessage => {
      this.errorMessage = errorMessage;
      this.loginInvalid = true;
    });
    this.authService.registerErrorMsg.subscribe(registerErrorMessage => {
      this.registerErrorMessage = registerErrorMessage;
      this.registerInvalid = true;
    });
  }

  onLoginSubmit() {
    this.registerInvalid = false;
    this.loginInvalid = false;
    this.authService.login(this.loginForm.get('email').value, this.loginForm.get('password').value);
  }

  onRegisterSubmit() {
    this.loginInvalid = false;
    this.registerInvalid = false;
    this.authService.register(this.registerForm.get('name').value, this.registerForm.get('email').value, this.registerForm.get('password').value, this.registerForm.get('address').value);
  }

}
