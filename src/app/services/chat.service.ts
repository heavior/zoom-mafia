import {Inject, Injectable} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {ActivatedRoute, Router} from "@angular/router";
import * as io from 'socket.io-client';
import {BehaviorSubject, fromEvent, Observable} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: any;
  private url: string = '/';
  data: any = {};
  gameSubject: BehaviorSubject<any> = new BehaviorSubject(undefined);
  roomSubject: BehaviorSubject<any> = new BehaviorSubject(undefined);
  roomLink: string = '';
  settingsSubject: BehaviorSubject<any> = new BehaviorSubject(undefined);

  constructor(@Inject(DOCUMENT) private document: Document,
              private route: ActivatedRoute,
              private router: Router) {
    this.socket = io(this.url);
    // @ts-ignore
    this.init();
  }

  private init() {
    this.socket.on('roomEvent', (data) => {
      console.log('Room Event >>', data);
      switch(data.event) {
        case 'created':
        case 'joined':
          this.roomId = data.id;
          this.roomLink = `${this.document.location.origin}/${data.id}`;
          Object.assign(this.data, data);
          this.roomSubject.next(this.data);
          return this.router.navigate([`/${data.id}`]);
        default:
          Object.assign(this.data, data);
          this.roomSubject.next(this.data)
          return;
      }
    });

    this.socket.on('directMessage', (message) => {
      switch (message.event) {
        case 'gameStatus':
          this.gameSubject.next(message.data);
          break;
        case 'roomDirectEvent':
          if (message.data.event === 'error') {
            alert(message.data.msg);
          }
          this.settingsSubject.next(message.data);
          break;
        default:
          break;
      }
    });

    this.socket.on('reconnect', () => {
      this.joinRoom({...this.data});
    });

    this.userName = localStorage.getItem('userName');
    setTimeout(() => {
      this.roomId = this.router.url.replace('/', '');
      const oldRoomId = localStorage.getItem('roomId');
      const userName = localStorage.getItem('userName');
      if (userName && oldRoomId === this.roomId) {
        this.userName = userName;
        this.joinRoom({...this.data})
      } else {
        localStorage.clear();
      }
    });

    fromEvent(window, 'beforeunload').subscribe(() => {
      localStorage.setItem('roomId', this.roomId);
      if (this.userName) {
        localStorage.setItem('userName', this.userName);
      }
    });
  }

  createRoom(data) {
    this.userName = data.userName;
    Object.assign(data, {action: 'create'});
    this.socket.emit('roomCommand', data);
  }

  joinGame(autoJoin: boolean) {
    this.socket.emit('roomCommand', {action: 'userSettings', settings: {autoJoin}});
  }

  joinRoom(data) {
    this.userName = data.userName;
    Object.assign(data, {action: 'join'});
    this.socket.emit('roomCommand', data);
  }

  kickPlayer(playerId: string) {
    this.socket.emit('roomCommand', {action: 'kick', targetId: playerId});
  }

  next() {
    this.socket.emit('gameCommand', {action: 'next'});
  }

  receiveMessages() {
    return new Observable((observer) => {
      this.socket.on('message', (data) => {
        observer.next(`${data.from}: ${data.msg}`);
      });
      this.socket.on('serverStatus', (message) => {
        observer.next(`ServerStatus: ${message}`);
      });
      /*this.socket.on('gameEvent', (message) => {
        observer.next('gameEvent' + JSON.stringify(message, null, 2));
        let game = Object.assign({}, this.gameSubject.getValue(), message);
        this.gameSubject.next(game);
      });*/
      this.socket.on('roomEvent', (message) => {
        observer.next('roomEvent' + JSON.stringify(message, null, 2));
      });
      this.socket.on('directMessage', (message) => {
        console.log(message)
        observer.next('directMessage' + JSON.stringify(message, null, 2));
      });
    });
  }

  sendMessage(msg) {
    this.socket.emit('message', { from: this.userName, msg });
  }

  startGame() {
    this.socket.emit('roomCommand', { action: 'startGame'});
  }

  vote(choice: number) {
    this.socket.emit('gameCommand', {action: 'vote', vote: choice});
  }

  get roomId() {
    return this.data.roomId;
  }

  set roomId(roomId) {
    this.data.roomId = roomId;
  }

  get userName() {
    return this.data.userName;
  }

  set userName(userName) {
    this.data.userId = userName;
    this.data.userName = userName;
  }

  get videoLink() {
    return this.data.videoLink;
  }

  set videoLink(videoLink) {
    this.data.videoLink = videoLink;
  }
}
