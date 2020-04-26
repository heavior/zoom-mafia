import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { ClipboardModule } from 'ngx-clipboard';
import { RoomComponent } from './pages/room/room.component';
import { AutoFocusDirective } from './directives/auto-focus.directive';
import { NewsComponent } from './components/news/news.component';
import { ColorizeUserDirective } from './directives/colorize-user.directive';
import { ColorizeUserListComponent } from './components/colorize-user-list/colorize-user-list.component';
import { PlayerInfoComponent } from './components/player-info/player-info.component';
import { GameInfoComponent } from './components/game-info/game-info.component';
import { RoomShareComponent } from './components/room-share/room-share.component';
import { MessengerComponent } from './components/messenger/messenger.component';
import { LoginComponent } from './components/login/login.component';
import { MinuteSecondPipe } from './pipes/minute-second.pipe';
import { QRCodeModule } from 'angularx-qrcode';
import { GameHelpComponent } from './components/game-help/game-help.component';



@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    RoomComponent,
    AutoFocusDirective,
    NewsComponent,
    ColorizeUserDirective,
    ColorizeUserListComponent,
    PlayerInfoComponent,
    GameInfoComponent,
    RoomShareComponent,
    MessengerComponent,
    LoginComponent,
    MinuteSecondPipe,
    GameHelpComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ClipboardModule,
    QRCodeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
