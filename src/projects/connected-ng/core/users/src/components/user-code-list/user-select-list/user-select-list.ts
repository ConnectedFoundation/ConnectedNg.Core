import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { User } from '../../../services/users/dtos/user-dtos';
import { CodeListLinkForm } from '@connected-ng/components/code-lists';
import { UserService } from '../../../services/users/user-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cn-user-select-list',
  imports: [CodeListLinkForm],
  templateUrl: './user-select-list.html',
  styleUrl: './user-select-list.scss',
})
export class UserSelectList {
  service = inject(UserService);

  items = signal<User[]>([]);
  filteredItems = computed(() => {
    const fn = this.filterFn();
    return fn ? this.items().filter(fn) : this.items();
  });

  immutableItems = input<any[]>([]);
  filterFn = input<((item: User) => boolean) | null>(null);

  selectedValues = model<number[]>([]);
  itemSelected = output<User>();
  itemDeselected = output<User>();

  private subscriptions = new Subscription();

  keySelector = (entity: User) => entity.id;
  displayMemberSelector = (entity: User) => `${entity.firstName} ${entity.lastName} (${entity.email})`;

  ngOnInit() {
    this.subscriptions.add(
      this.service.queryAndSubscribe$().subscribe(items => this.items.set(items))
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
