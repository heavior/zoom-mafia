import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { Observable } from "rxjs";
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = 'http://localhost:8080/';
  data: any = {};

  constructor(private router: Router) {
    this.socket = io(this.url);
    this.socket.on('roomEvent', (data) => {
      switch(data.event) {
        case 'created':
          this.data.roomId = data.id;
          return this.router.navigate(['room']);
        default:
          return;
      }
    })
  }

  createRoom() {
    const data = Object.assign({}, this.data, {action: 'create'});
    this.socket.emit('roomCommand', data);
  }

  receiveMessages() {
    return new Observable((observer) => {
      this.socket.on('message', (data) => {
        observer.next(`${data.from}: ${data.msg}`);
      });
      this.socket.on('serverStatus', (message) => {
        observer.next(`ServerStatus: ${message}`);
      });
    });
  }

  sendMessage(msg) {
    this.socket.emit('message', { from: this.userName, msg });
  }

  get userName() {
    return this.data.userName;
  }

  set userName(userName) {
    this.data.userId = userName;
    this.data.userName = userName;
    this.socket.emit('server', { action: 'usernameSet', userName });
  }

  get videoLink() {
    return this.data.videoLink;
  }

  set videoLink(videoLink) {
    this.data.videoLink = videoLink;
  }
}
