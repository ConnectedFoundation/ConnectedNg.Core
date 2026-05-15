import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { Role } from '../../../services/roles/dtos/role-dtos';
import { CodeListLinkForm } from '@connected-ng/components/code-lists';
import { RoleService } from '../../../services/roles/role-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cn-role-select-list',
  imports: [CodeListLinkForm],
  templateUrl: './role-select-list.html',
  styleUrl: './role-select-list.scss',
})
export class RoleSelectList {
  service = inject(RoleService);

  items = signal<Role[]>([]);
  filteredItems = computed(() => {
    const fn = this.filterFn();
    return fn ? this.items().filter(fn) : this.items();
  });

  immutableItems = input<any[]>([]);
  filterFn = input<((item: Role) => boolean) | null>(null);

  selectedValues = model<number[]>([]);
  itemSelected = output<Role>();
  itemDeselected = output<Role>();

  private subscriptions = new Subscription();

  keySelector = (entity: Role) => entity.id;
  displayMemberSelector = (entity: Role) => entity.name;

  ngOnInit() {
    this.subscriptions.add(
      this.service.queryAndSubscribe$().subscribe(items => this.items.set(items))
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
