import {Directive, ElementRef, HostBinding, Input, OnInit} from '@angular/core';

@Directive({
  selector: '[appColorizeUser]'
})
export class ColorizeUserDirective implements OnInit {
  @Input() player: any;

  @HostBinding('class') className: string;

  constructor() {}

  ngOnInit(): void {
    const { role } = this.player;
    this.className = this.mafiaRole(role) ? 'text-danger' : this.civilianRole(role) ? 'text-success' : '';
  }

  private civilianRole(role){
    return role === 'Civilian' || role === 'Detective';
  }

  private mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }

}
