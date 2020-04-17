import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IGame } from "../../interfaces";
import { ChatService } from "../../services/chat.service";

@Component({
  selector: 'host-info',
  templateUrl: './host-info.component.html',
  styleUrls: ['./host-info.component.scss']
})
export class HostInfoComponent implements OnInit {
  @Input() game: IGame;
  @Output() gameStarting: EventEmitter<any> = new EventEmitter();

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
  }

  next() {
    this.chatService.next();
  }

  startGame() {
    this.chatService.startGame();
    this.gameStarting.emit(null);
  }

}
