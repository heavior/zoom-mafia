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
    return this.chatService.userName ? true : this.router.navigate(['/']);
  }

}
