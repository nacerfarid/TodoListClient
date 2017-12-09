///<reference path="../../../app/data/todoListTypes.ts"/>
import {Injectable} from "@angular/core";
import 'rxjs/add/operator/toPromise';
import {
  ItemID, ListID,
  MESSAGE_FOR_SERVER, SERVER_UPDATE_ITEM_CHECK, SERVER_UPDATE_ITEM_LABEL,
  MESSAGE_FOR_CLIENT, TODOLISTS_NEW_STATE,
  TodoListJSON, ItemJSON, TodoListWithItems, SERVER_DELETE_ITEM, SERVER_DELETE_LIST, SERVER_UPDATE_LIST_DATA,
  SERVER_UPDATE_LIST_NAME, SERVER_UPDATE_ITEM_DATA,
} from "../data/protocol";
export {
  ItemID, ListID,
  MESSAGE_FOR_SERVER, SERVER_UPDATE_ITEM_CHECK, SERVER_UPDATE_ITEM_LABEL,
  MESSAGE_FOR_CLIENT, TODOLISTS_NEW_STATE,
  TodoListJSON, ItemJSON, TodoListWithItems,
} from "../data/protocol";
import {Http, Response} from "@angular/http";
import * as io from "socket.io-client";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {PartialObserver} from "rxjs/Observer";
import {Subscription} from "rxjs/Subscription";
import {Observable} from "rxjs/Observable";

let nbUpdate = 0;
function* generatorPrefix(prefix: string) {
  let i = 0;
  while (true) {
    yield `${prefix}::${++i}`;
  }
}

@Injectable()
export class TodoListService {
  private sio: SocketIOClient.Socket;
  private user;
  private ListUIs: TodoListWithItems[] = [];
  private itemsJSON: ItemJSON[] = [];
  private genId = generatorPrefix( Date.now() + "::" );
  private connected = new BehaviorSubject<boolean>(false);
  private messagesToSendAfterReconnection: MESSAGE_FOR_SERVER[] = [];
  constructor(private http: Http) {
    this.sio = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax : 5000,
      reconnectionAttempts: Infinity
    });
    this.sio.connect();
    this.sio.on("connect", () => {
      console.log("Connection with socket.io server established");
      if (this.user) {
        this.connected.next(true);
      }
    });
    this.sio.on("disconnect", () => {
      console.log("socket.io disconnect");
      this.connected.next(false);
    });
    this.sio.on("user", (userJSON) => {
      this.user = userJSON.passport;
      this.connected.next(true);
    });
    this.sio.on("MESSAGE_FOR_CLIENT", (msg: MESSAGE_FOR_CLIENT) => {
      switch (msg.type) {
        case "TODOLISTS_NEW_STATE":
          this.TODOLISTS_NEW_STATE(msg);
          if (this.messagesToSendAfterReconnection.length > 0) {
            this.sio.emit("operations", this.messagesToSendAfterReconnection);
            this.messagesToSendAfterReconnection = [];
          }
          break;
        default:
          console.log("Unsupported message", msg);
      }
    });
  }

  sendState() {
    const op: TODOLISTS_NEW_STATE = {
      type: "TODOLISTS_NEW_STATE",
      lists: this.ListUIs.map(
        L => Object.assign({}, L, {items: L.items.map( I  => I.id)})
      ),
      items: this.ListUIs.reduce(
        (items: ItemJSON[], list: TodoListWithItems) => {
          items.push(...list.items);
          return items;
        }, [] )
    };
    console.log("Updating state from local", op);
    this.emit(op);
  }

  tryReconnectSocket() {
    this.sio.open();
  }

  /*****************************************************************************************************************************************
   * Operations on lists *******************************************************************************************************************
   ****************************************************************************************************************************************/
  SERVER_CREATE_NEW_LIST(name: string) {
    const id = this.getLocalListId();
    this.ListUIs.push({
      name: name,
      items: [],
      id: id,
      clock: -1,
      data: {}
    });
    this.emit( {
      type: "SERVER_CREATE_NEW_LIST",
      name: name,
      clientListId: id
    } );
    return id;
  }

  SERVER_UPDATE_LIST_NAME(ListID: ListID, name: string) {
    const op: SERVER_UPDATE_LIST_NAME = {
      type : "SERVER_UPDATE_LIST_NAME",
      ListID : ListID,
      name: name
    };
    this.emit(op);
  }

  SERVER_DELETE_LIST(ListID: ListID) {
    const op: SERVER_DELETE_LIST = {
      type: "SERVER_DELETE_LIST",
      ListID: ListID,
    };
    this.emit(op);
    this.ListUIs = this.ListUIs.filter( L => L.id !== ListID );
  }

  SERVER_UPDATE_LIST_DATA(ListID: ListID, data: Object) {
    const op: SERVER_UPDATE_LIST_DATA = {
      type: "SERVER_UPDATE_LIST_DATA",
      ListID: ListID,
      data: data
    };
    this.emit(op);
    this.ListUIs = this.ListUIs.map( L => {
      if (L.id === ListID) {
        const newL = Object.assign({}, L);
        newL.data = data;
        return newL;
      } else {
        return L;
      }
    } );
  }

  /*****************************************************************************************************************************************
   * Operations on items *******************************************************************************************************************
   ****************************************************************************************************************************************/
  SERVER_CREATE_ITEM(ListID: ListID, label: string, tag: string, color: string, checked: boolean = false) {
    const id = this.genId.next().value;
    this.emit({
      type: "SERVER_CREATE_ITEM",
      ListID: ListID,
      label: label,
      tag: tag,
      color: color,
      clientItemId: id
    });
    this.ListUIs.find( L => L.id === ListID ).items.push({
      label: label,
      id: id,
      date: Date.now(),
      checked: false,
      clock: -1,
      data: {
        tag,
        color
      }
    });
  }

  SERVER_DELETE_ITEM(ListID: ListID, ItemID: ItemID) {
    const op: SERVER_DELETE_ITEM = {
      type: "SERVER_DELETE_ITEM",
      ListID: ListID,
      ItemID: ItemID
    };
    this.emit(op);
    const list = this.getList(ListID);
    list.items = list.items.filter( I => I.id !== ItemID );
    this.itemsJSON = this.itemsJSON.filter( I => I.id !== ItemID );
  }

  SERVER_UPDATE_ITEM_CHECK(ListID: ListID, ItemID: ItemID, checked: boolean) {
    const op: SERVER_UPDATE_ITEM_CHECK = {
      type: "SERVER_UPDATE_ITEM_CHECK",
      ListID: ListID,
      ItemID: ItemID,
      check: checked
    };
    this.emit(op);
    this.localUpdateItem(ListID, ItemID, {checked: checked});
  }

  SERVER_UPDATE_ITEM_LABEL(ListID: ListID, ItemID: ItemID, label: string) {
    const op: SERVER_UPDATE_ITEM_LABEL = {
      type: "SERVER_UPDATE_ITEM_LABEL",
      ListID: ListID,
      ItemID: ItemID,
      label: label
    };
    this.emit(op);
    this.localUpdateItem(ListID, ItemID, {label: label});
  }
  SERVER_UPDATE_ITEM_DATA(ListID: ListID, ItemID: ItemID, data: Object) {
    const op: SERVER_UPDATE_ITEM_DATA = {
      type: "SERVER_UPDATE_ITEM_DATA",
      ListID: ListID,
      ItemID: ItemID,
      data: data
    };
    this.emit(op);
    this.localUpdateItem(ListID, ItemID, {data});
  }

  /*****************************************************************************************************************************************
   * Global update of lists and items ******************************************************************************************************
   ****************************************************************************************************************************************/
  private TODOLISTS_NEW_STATE(msg: TODOLISTS_NEW_STATE): void {
    // Update ItemUIs
    console.log("TODOLISTS_NEW_STATE:", msg);
    this.itemsJSON = msg.items.map( itemJSON => {
      const itemUI = this.itemsJSON.find( I => I.id === itemJSON.id ) || itemJSON;
      if (itemUI.clock < itemJSON.clock) {
        Object.assign(itemUI, itemJSON);
        // itemUI.label = `${itemUI.label} (update ${nbUpdate++})`;
      }
      return itemUI;
    });
    // Update listsUI
    this.ListUIs = msg.lists.map( listJSON => {
      const listUI = this.ListUIs.find( L => L.id === listJSON.id ) || {
        clock: -1,
        name: null,
        items: null,
        id: listJSON.id,
        data: {}
      };
      if (listUI.clock < listJSON.clock) {
        Object.assign(listUI, {
          name: listJSON.name, // `${listJSON.name} (update ${nbUpdate++})`,
          clock: listJSON.clock,
          items: listJSON.items.map( itemId => {
            return this.itemsJSON.find( I => I.id === itemId );
          }),
          data: listJSON.data
        });
      }
      return listUI;
    });
  }


  // _______________________________________________________________________________________________________________________________________
  getConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  getUser() {
    return this.user;
  }

  getLists(): TodoListWithItems[] {
    return this.ListUIs;
  }
  getItems(): ItemJSON[]{
    return this.itemsJSON;
  }
  emit(msg: MESSAGE_FOR_SERVER, cb?: (response: any) => any) {
    if (this.connected.getValue()) {
      return this.sio.emit("operation", msg, cb);
    } else {
      this.messagesToSendAfterReconnection.push( msg );
    }
  }

  getLocalListId(): ListID {
    return this.genId.next().value;
  }

  private getList(ListID: ListID): TodoListWithItems {
    return this.ListUIs.find( L => L.id === ListID );
  }

  private getItem(ListID: ListID, ItemID: ItemID): ItemJSON {
    return this.getList(ListID).items.find( I => I.id === ItemID );
  }

  private localUpdateItem(ListID: ListID, ItemID: ItemID, update: {label?: string, tag?: string, checked?: boolean, data?: Object}) {
    const list = this.getList(ListID);
    list.items = list.items.map( I => I.id !== ItemID ? I : Object.assign(I, update) );
  }
}
