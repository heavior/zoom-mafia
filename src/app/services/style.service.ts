import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from "@angular/common";

@Injectable({
  providedIn: 'root'
})
export class StyleService {
  constructor(@Inject(DOCUMENT) private document: Document) { }

  set dayStyle(mode) {
    this.document.body.setAttribute('class', mode === 'Night' ? 'bg-dark text-white' : '');
  }
}
