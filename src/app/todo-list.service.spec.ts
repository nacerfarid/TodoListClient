import { TestBed, inject } from '@angular/core/testing';

import { TodoListService } from './todo-list.service';

describe('TodoListServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TodoListService]
    });
  });

  it('should be created', inject([TodoListService], (service: TodoListService) => {
    expect(service).toBeTruthy();
  }));
});
