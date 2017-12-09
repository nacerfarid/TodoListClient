import {Component, Input, OnInit, style} from '@angular/core';
import {TodoListService} from "./todo-list.service";
import {Router} from "@angular/router";
import "rxjs/add/operator/filter";
import {PassportUser} from "../data/protocol";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {DomSanitizer} from "@angular/platform-browser";
import { HotkeysService} from "angular2-hotkeys";
import { Hotkey} from "angular2-hotkeys";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @Input() title = 'Listes de choses à faire';
  showStyle: false;
  display: boolean = false;
  //liste: ListsComponent;
  constructor(private tdlService: TodoListService,
              private router: Router,
              private sanitizer: DomSanitizer,
              private _hotkeysService: HotkeysService) {
    this._hotkeysService.add(new Hotkey(['shift+h', 'alt+h'], (event: KeyboardEvent): boolean => {
      this.showHelp();
      return false; // Prevent bubbling
    }));
  }

  getUser(): PassportUser {
    return this.tdlService.getUser();
  }

  getUserProvider(): string {
    return this.getUser().provider;
  }

  getUserName(): string {
    return this.getUser().name;
  }

  getUserMail(): string {
    const emails = this.getUser().emails;
    return emails ? emails[0] : "";
  }

  getUserPhoto(): string {
    const photos = this.getUser().photos;
    return photos ? photos[0] : "";
  }

  getConnected() {
    return this.tdlService.getConnected();
  }

  tryReconnectSocket() {
    this.tdlService.tryReconnectSocket();
  }

  ngOnInit() {
    this.router.navigate(["lists"]);
  }


  getStyle(){
    if(this.showStyle) {
      return this.sanitizer.bypassSecurityTrustStyle("invert(20%)");
    } else {
      return this.sanitizer.bypassSecurityTrustStyle("invert(0%)");
    }
  }
  changeBackgroundColor(){
    if(this.showStyle) {
      return this.sanitizer.bypassSecurityTrustStyle("darkgrey");
    } else {
      return this.sanitizer.bypassSecurityTrustStyle("white");
    }
  }

  showHelp(){
    this.display = true;
  }
  allRequiredStyles() {
    let myStyles;
    if(this.showStyle) {
      myStyles = {
        'color':  'white',
        'background-color': 'black'
      };
    } else{
      myStyles = {
        'color':  'black',
        'background-color': 'white'
      };
    }
    return myStyles;
  };
}
