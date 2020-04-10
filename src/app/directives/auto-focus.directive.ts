import { Directive, ElementRef, Input, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[autoFocus]'
})
export class AutoFocusDirective implements AfterViewInit{
  private _autofocus;
  constructor(private el: ElementRef)
  {
  }

  ngAfterViewInit() {
    if (this._autofocus || typeof this._autofocus === "undefined")
      this.el.nativeElement.focus();
  }

  @Input() set autofocus(condition: boolean) {
    this._autofocus = condition != false;
  }

}
