import { Component, effect, signal } from '@angular/core';
import { CodeListHeaderBase } from '@connected-ng/components/code-lists';
import { User } from '../../../services/users/dtos/user-dtos';
import { Observable } from 'rxjs';

@Component({
  selector: 'cn-user-item-header',
  imports: [],
  templateUrl: './user-item-header.html',
  styleUrl: './user-item-header.scss',
})
export class UserItemHeader extends CodeListHeaderBase {
  user = signal<User | undefined>(undefined);

  constructor() {
    super();

    effect(() => {
      if (this.data()?.entityLoader) {
        this.subscriptions.add((this.data().entityLoader as Observable<User>).subscribe(user => { this.user.set(user) }));
      }
    });
  }
}

