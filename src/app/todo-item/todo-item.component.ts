import {ChangeDetectionStrategy, Component, Input, OnInit, EventEmitter, Output} from '@angular/core';
import {ListID, ItemJSON, TodoListService} from "../todo-list.service";
import {ItemID} from "../../data/protocol";
import {ConfirmationService} from "primeng/primeng";
import {Message} from "primeng/primeng";
import {ToasterService, ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'app-todo-item',
  templateUrl: './todo-item.component.html',
  styleUrls: ['./todo-item.component.css'],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoItemComponent implements OnInit {
  toasterconfig: ToasterConfig =
    new ToasterConfig({
      showCloseButton: true,
      tapToDismiss: false,
      timeout: 2000,
      animation: 'fade'
    });
  @Input() item: ItemJSON;
  @Input() listId: ListID;
  @Input() last: boolean;
  @Input() index: number;
  @Input() clock: number;
  @Output() onItemDelete = new EventEmitter<ItemID>();
  @Output() onItemChange = new EventEmitter<ItemID>();
  @Output() onItemSort = new EventEmitter<any>();
  msgs: Message[] = [];
  constructor(private todoListService: TodoListService) {
  }

  ngOnInit() {
  }

  getItems(): ItemJSON[] {
    return this.todoListService.getItems();
  }

  setLabel(label: string) {
    if (label === "") {
      this.delete();
    } else {
      this.todoListService.SERVER_UPDATE_ITEM_LABEL(this.listId, this.item.id, label);
    }
    this.editLabel(false);
    this.onItemChange.emit(this.item.id);
  }

  setTag(tag: string) {
    if(tag !== '' && tag.length <6) {
      this.item.data["tag"] = tag;
      this.todoListService.SERVER_UPDATE_ITEM_DATA(this.listId, this.item.id, this.item.data);
      this.editLabel(false);
      this.onItemChange.emit(this.item.id);
    }
  }

  isEditingLabel(): boolean {
    return this.item.data["edited"];
  }

  editLabel(edit: boolean) {
    this.item.data["edited"] = edit;
    this.todoListService.SERVER_UPDATE_ITEM_DATA(this.listId, this.item.id, this.item.data);
  }

  check(checked: boolean) {
    this.todoListService.SERVER_UPDATE_ITEM_CHECK(this.listId, this.item.id, checked);
    this.onItemChange.emit(this.item.id);
  }

  delete() {
    this.onItemDelete.emit(this.item.id);
  }
  editItem(label: string, tag: string) {
    this.setLabel(label);
    this.setTag(tag);
    this.item.data["edited"] = false;
    this.todoListService.SERVER_UPDATE_ITEM_DATA(this.listId, this.item.id, this.item.data);
  }
  onDropDataOrder($event: any) {
    $event.newIndex = this.index;
    if (this.last) $event.newIndex++;
    this.onItemSort.emit($event);
  }


}
