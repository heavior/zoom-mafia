import {Inject, Injectable} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {ActivatedRoute, Router} from "@angular/router";
import * as io from 'socket.io-client';
import {BehaviorSubject, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = '/';
  data: any = {};
  gameState: BehaviorSubject<string> = new BehaviorSubject('');
  roomLink: string = '';

  constructor(@Inject(DOCUMENT) private document: Document,
              private route: ActivatedRoute,
              private router: Router) {
    this.socket = io(this.url);
    this.data.roomId = this.router.url.replace('/', '');
    this.init();
  }

  private init() {
    this.socket.on('roomEvent', (data) => {
      switch(data.event) {
        case 'created':
        case 'joined':
          this.data.roomId = data.id;
          this.roomLink = `${this.document.location.origin}/${data.id}`;
          return this.router.navigate(['room']);
        case 'start':
        case 'discussion':
        case 'night':
        case 'vote':
          this.gameState.next(data.event);
          break;
        default:
          return;
      }
    });
  }

  createRoom() {
    const data = Object.assign({}, this.data, {action: 'create'});
    this.socket.emit('roomCommand', data);
  }

  joinRoom() {
    const data = Object.assign({}, this.data, {action: 'join'});
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

  startGame() {
    this.socket.emit('roomCommand', { action: 'startGame'});
  }

  get roomId() {
    return this.data.roomId;
  }

  get userName() {
    return this.data.userName;
  }

  set userName(userName) {
    this.data.userId = userName;
    this.data.userName = userName;
    this.socket.emit('server', { action: 'setUserName', userName });
  }

  get videoLink() {
    return this.data.videoLink;
  }

  set videoLink(videoLink) {
    this.data.videoLink = videoLink;
  }
}
