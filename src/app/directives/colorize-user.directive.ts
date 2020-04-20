import { Directive, HostBinding, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appColorizeUser]'
})
export class ColorizeUserDirective implements OnChanges {
  @Input() player: any;

  @HostBinding('class') className: string;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if(!changes.player.previousValue || this.player.role !== changes.player.previousValue.role) {
      const { role } = this.player;
      this.className = this.mafiaRole(role) ? 'text-danger' : this.civilianRole(role) ? 'text-success' : '';
    }
  }

  private civilianRole(role){
    return role === 'Civilian' || role === 'Detective';
  }

  private mafiaRole(role){
    return role === 'Mafia' || role === 'Don';
  }

}
