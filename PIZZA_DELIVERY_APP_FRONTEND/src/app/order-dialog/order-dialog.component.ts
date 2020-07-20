import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-order-dialog',
  templateUrl: './order-dialog.component.html',
  styleUrls: ['./order-dialog.component.scss']
})
export class OrderDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: string) { }

  ngOnInit(): void {
  }

}
