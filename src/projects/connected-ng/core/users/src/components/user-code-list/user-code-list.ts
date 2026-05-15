import { Component, inject, Injector, OnDestroy, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { CodeListActions, CodeListActionsContainer, CodeListBase, CodeListList, CodeListStackPageInfo } from '@connected-ng/components/code-lists'
import { UserCodeListHeader } from './user-code-list-header/user-code-list-header';
import { UserService } from '../../services/users/user-service';
import { User } from '../../services/users/dtos/user-dtos';
import { UserInsertForm } from './user-insert-form/user-insert-form';
import { ChildPageProviderService, ChildPageRegistration, POP_NAVIGATION } from '@connected-ng/components/navigation';
import { UserUpdateForm } from './user-update-form/user-update-form';
import { UserUpdateFormFields } from './user-update-form/user-update-form-fields/user-update-form-fields';

@Component({
  selector: 'cn-user-code-list',
  imports: [CodeListList, CodeListActionsContainer],
  templateUrl: './user-code-list.html',
  styleUrl: './user-code-list.scss',
})
export class UserCodeList extends CodeListBase implements OnDestroy {
  static readonly routePattern = routePattern('users');

  static fromParams(injector: Injector): CodeListStackPageInfo {
    let insertForm = UserInsertForm.fromParams({}, injector);
    insertForm.outputs = { formClose: POP_NAVIGATION };

    let updateForm = UserUpdateForm.fromParams({}, injector)!;
    updateForm.outputs = { formClose: POP_NAVIGATION };

    return {
      component: UserCodeList,
      headerComponent: UserCodeListHeader,
      key: UserCodeList.routePattern.pattern,
      icon: 'category',
      data: {},
      title: 'Users',
      childPages: [
        insertForm,
        updateForm
      ]
    };
  }

  userService = inject(UserService);
  private childPageProvider = inject(ChildPageProviderService, { optional: true });

  items = signal<User[]>([]);

  actions(item: User) {
    const registrations = this.childPageProvider?.getRegistrations(UserUpdateFormFields) ?? [];
    return [
      CodeListActions.editAction(
        (i: unknown) => this.navigateToItem(i as User),
        (i: unknown) => `${this.navigationContext.getUrlFromStack()}/${UserUpdateForm.routePattern.build({ id: (i as User).id })}`
      ),
      ...registrations
        .filter(r => r.action)
        .map(r => CodeListActions.relatedCodeListAction(
          (i: unknown) => this.navigateToChildPage(i as User, r),
          (i: unknown) => `${this.navigationContext.getUrlFromStack()}/${UserUpdateForm.routePattern.build({ id: (i as User).id })}/${r.routePattern}`,
          r.action!.label,
          r.action?.description
        ))
    ];
  }

  override codeListActions = signal([
    CodeListActions.insertItemAction(
      () => this.navigateToInsert(),
      `${this.navigationContext.getUrlFromStack()}/${UserInsertForm.routePattern.pattern}`
    )
  ]);

  navigateToInsert() {
    const insertPage = UserInsertForm.fromParams({}, this.injector);
    insertPage.outputs = { formClose: () => this.navigationContext.back() };
    this.navigationContext.push(insertPage);
  }

  override ngOnInit() {
    super.ngOnInit();

    this.subscriptions.add(
      this.userService.queryAndSubscribe$().subscribe(items => this.items.set(items))
    );
  }

  navigateToItem(item: User) {
    const editPage = UserUpdateForm.fromParams({ id: item.id.toString() }, this.injector);
    editPage.outputs = { formClose: () => this.navigationContext.back() };
    this.navigationContext.push(editPage);
  }

  navigateToChildPage(item: User, registration: ChildPageRegistration) {
    const childPage = registration.factory({ id: item.id.toString() }, this.injector);
    const updateForm = UserUpdateForm.fromParams({ id: item.id.toString() }, this.injector);
    updateForm.outputs = { formClose: () => this.navigationContext.pop() };
    this.navigationContext.push(updateForm, childPage);
  }
}
