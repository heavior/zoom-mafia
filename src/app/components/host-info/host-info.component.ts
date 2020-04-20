import { Component, Input, OnInit } from '@angular/core';
import { IGame } from "../../interfaces";
import { ChatService } from "../../services/chat.service";

@Component({
  selector: 'host-info',
  templateUrl: './host-info.component.html',
  styleUrls: ['./host-info.component.scss']
})
export class HostInfoComponent implements OnInit {
  @Input() game: IGame;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
  }

  next() {
    this.chatService.next();
  }

  startGame(needConfirmation = false) {
    if (!needConfirmation || confirm('Are you sure you want to restart the game? All progress will be lost for all players.')) {
      this.chatService.startGame();
    }
  }
}
