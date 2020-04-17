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

  constructor(private chatService: ChatService) { }

  ngOnInit(): void {
    this.action = this.join ? 'Join' : 'Create';
    this.userName = this.chatService.userName;
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
