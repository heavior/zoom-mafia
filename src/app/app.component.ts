import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'zoom-mafia-app';
  pingInterval = 25 * 60 * 1000;

  constructor(private http: HttpClient) {
    setInterval(() => {
      this.http.get('/api/ping').toPromise().then(() => {}).catch(() => {
        console.log('Ping failed.');
      });
    }, this.pingInterval);
  }
}
