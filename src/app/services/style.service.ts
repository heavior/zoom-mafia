import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class StyleService {
  constructor(@Inject(DOCUMENT) private document: Document) { }

  set dayStyle(mode) {
    const style = `d-flex flex-grow-1 flex-column${mode === 'Night' ? ' bg-dark text-white' : ''}`;
    this.document.body.setAttribute('class', style);
  }
}
