import { Component, Input, OnInit } from '@angular/core';
import { IGame } from "../../interfaces";
import { ChatService } from "../../services/chat.service";
import {filter} from 'rxjs/operators';
import {Subscription} from 'rxjs';

@Component({
  selector: 'room-share',
  templateUrl: './room-share.component.html',
  styleUrls: ['./room-share.component.scss']
})
export class RoomShareComponent implements OnInit {
  @Input() game: IGame;
  hideRoomInfo = true;
  roomLink: string;
  autoJoin = true;
  private settingsSubject: Subscription;
  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.roomLink = this.chatService.roomLink;
    this.settingsSubject = this.chatService.settingsSubject
      .pipe(filter((data) => data !== undefined))
      .subscribe((data) => {
        if (data.settings && data.settings.autoJoin) {
          this.autoJoin = data.settings.autoJoin;
        }
      });
  }
  toggleJoinGame() {
    this.chatService.joinGame(!this.autoJoin);
  }
}
