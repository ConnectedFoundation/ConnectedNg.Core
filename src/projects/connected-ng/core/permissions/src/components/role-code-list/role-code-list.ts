import { Component, inject, Injector, OnDestroy, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { CodeListActions, CodeListActionsContainer, CodeListBase, CodeListList, CodeListStackPageInfo } from '@connected-ng/components/code-lists';
import { RoleCodeListHeader } from './role-code-list-header/role-code-list-header';
import { RoleService } from '../../services/roles/role-service';
import { Role } from '../../services/roles/dtos/role-dtos';
import { RoleInsertForm } from './role-insert-form/role-insert-form';
import { RoleUpdateForm } from './role-update-form/role-update-form';
import { ChildPageProviderService, ChildPageRegistration, POP_NAVIGATION } from '@connected-ng/components/navigation';
import { RoleUpdateFormFields } from './role-update-form/role-update-form-fields/role-update-form-fields';
import { Subscription } from 'rxjs';

@Component({
  selector: 'cn-role-code-list',
  imports: [CodeListList, CodeListActionsContainer],
  templateUrl: './role-code-list.html',
  styleUrl: './role-code-list.scss',
})
export class RoleCodeList extends CodeListBase implements OnDestroy {
  static readonly routePattern = routePattern('roles');

  static fromParams(injector: Injector): CodeListStackPageInfo {
    let insertForm = RoleInsertForm.fromParams({}, injector);
    insertForm.outputs = { formClose: POP_NAVIGATION };

    let updateForm = RoleUpdateForm.fromParams({}, injector);
    updateForm.outputs = { formClose: POP_NAVIGATION };

    return {
      component: RoleCodeList,
      headerComponent: RoleCodeListHeader,
      key: RoleCodeList.routePattern.pattern,
      icon: 'manage_accounts',
      data: {},
      title: 'Roles',
      childPages: [
        insertForm,
        updateForm
      ]
    };
  }

  roleService = inject(RoleService);
  private childPageProvider = inject(ChildPageProviderService, { optional: true });

  items = signal<Role[]>([]);

  actions(item: Role) {
    const registrations = this.childPageProvider?.getRegistrations(RoleUpdateFormFields) ?? [];
    return [
      CodeListActions.editAction(
        (i: unknown) => this.navigateToItem(i as Role),
        (i: unknown) => `${this.navigationContext.getUrlFromStack()}/${RoleUpdateForm.routePattern.build({ id: (i as Role).id })}`
      ),
      CodeListActions.getStatusChangeAction(
        item,
        (i: unknown) => this.roleService.update(i as Role).subscribe()
      ),
      ...registrations
        .filter(r => r.action)
        .map(r => CodeListActions.relatedCodeListAction(
          (i: unknown) => this.navigateToChildPage(i as Role, r),
          (i: unknown) => `${this.navigationContext.getUrlFromStack()}/${RoleUpdateForm.routePattern.build({ id: (i as Role).id })}/${r.routePattern}`,
          r.action!.label,
          r.action?.description
        ))
    ];
  }

  override codeListActions = signal([
    CodeListActions.insertItemAction(
      () => this.navigateToInsert(),
      `${this.navigationContext.getUrlFromStack()}/${RoleInsertForm.routePattern.pattern}`
    )
  ]);

  navigateToInsert() {
    const insertPage = RoleInsertForm.fromParams({}, this.injector);
    insertPage.outputs = { formClose: () => this.navigationContext.back() };
    this.navigationContext.push(insertPage);
  }

  navigateToItem(item: Role) {
    const updatePage = RoleUpdateForm.fromParams({ id: item.id.toString() }, this.injector);
    updatePage.outputs = { formClose: () => this.navigationContext.back() };
    this.navigationContext.push(updatePage);
  }

  navigateToChildPage(item: Role, registration: ChildPageRegistration) {
    const childPage = registration.factory({ id: item.id.toString() }, this.injector);
    const updatePage = RoleUpdateForm.fromParams({ id: item.id.toString() }, this.injector);
    updatePage.outputs = { formClose: () => this.navigationContext.pop() };
    this.navigationContext.push(updatePage, childPage);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.subscriptions.add(
      this.roleService.queryAndSubscribe$().subscribe(items => this.items.set(items))
    );
  }

  override ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
