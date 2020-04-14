import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'colorize-user-list',
  templateUrl: './colorize-user-list.component.html',
  styleUrls: ['./colorize-user-list.component.scss']
})
export class ColorizeUserListComponent implements OnInit {
  @Input() players: any;

  constructor() { }

  ngOnInit(): void {
  }

}
