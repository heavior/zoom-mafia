import { Component, Input, OnInit } from '@angular/core';
import {ChatService} from "../../services/chat.service";

@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  @Input() join: boolean;
  action: string;
  userName: string;
  videoLink: string;
  roomLink: string;

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.userName = this.chatService.userName;
    this.roomLink = document.location.href;
    this.action = this.join ? 'Join' : 'Create a';
  }

  submit() {
    const data: any = {
      userId: this.userName,
      userName: this.userName
    };

    if (this.videoLink) {
      data.videoLink = this.videoLink;
    }
    if (this.join) {
      data.roomId = this.chatService.roomId;
    }
    this.join ? this.chatService.joinRoom(data) : this.chatService.createRoom(data);
  }

}
