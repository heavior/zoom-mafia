import { Component, Input, OnInit } from '@angular/core';
import { IPlayer } from "../../interfaces";

@Component({
  selector: 'player-info',
  templateUrl: './player-info.component.html',
  styleUrls: ['./player-info.component.scss']
})
export class PlayerInfoComponent implements OnInit {
  @Input() endGameMessage: string;
  @Input() gameOn: boolean;
  @Input() player: IPlayer;
  @Input() state: string;
  @Input() winner: string;

  constructor() { }

  ngOnInit(): void {
  }

  roleToClass(role) {
    switch (role) {
      case 'Civilian':
      case 'Detective':
        return 'text-success';
      case 'Mafia':
      case 'Don':
        return 'text-danger';
      default:
        return '';
    }
  }

}
