import { Injectable } from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router} from '@angular/router';
import { Observable } from 'rxjs';
import {ChatService} from "../services/chat.service";

@Injectable({
  providedIn: 'root'
})
export class RoomGuard implements CanActivate {

  constructor(private chatService: ChatService,
              private router: Router) { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const roomId = next.params.roomId;
    this.chatService.roomId = roomId;
    return roomId !== 'undefined' ? true : this.router.navigate(['/']);
  }

}
