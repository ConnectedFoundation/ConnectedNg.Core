import { Component, computed, inject, Injector, input } from '@angular/core';
import { UpdateUserDto, User, UserService } from '../../../public-api';
import { CodeListActions, CodeListUpdateForm, CodeListUpdateFormBase } from '@connected-ng/components/code-lists';
import { hideField, localizeFields, useCodeListSelectBox } from '@connected-ng/components/code-lists/helpers';
import { FormGenerationInterceptors, FormResult } from '@connected-ng/components/forms';
import { ChildPageProviderService, StackComponent, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { routePattern } from '@connected-ng/core';
import { UserSelectBox } from '../user-select-box/user-select-box';
import { UserUpdateFormFields } from './user-update-form-fields/user-update-form-fields';
import { UserItemHeader } from '../user-item-header/user-item-header';

@Component({
  selector: 'cn-user-update-form',
  imports: [StackComponent],
  template: CodeListUpdateFormBase.TEMPLATE,
  styleUrl: './user-update-form.scss',
})
export class UserUpdateForm extends CodeListUpdateFormBase<UpdateUserDto, User> {
  /**
     * Route pattern for this component.
     */
  static readonly routePattern = routePattern('edit/:id');

  static fieldLocalizer = localizeFields({
    'firstName': () => 'First name',
    'lastName': () => 'Last name',
    'email': () => 'Username'
  });
  /**
   * Factory method to create page info from URL parameters.
   * Called by navigation context when URL matches the pattern.
   */
  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const id = Number(params['id']);

    const formInterceptors: FormGenerationInterceptors = {
      fieldInterceptors: [
        hideField('id'),
        this.fieldLocalizer
      ]
    };

    const service = injector.get(UserService);
    const childPageProvider = injector.get(ChildPageProviderService, null);
    const registrations = childPageProvider?.getRegistrations(UserUpdateFormFields) ?? [];
    const childPages = childPageProvider?.createChildPages(UserUpdateFormFields, params, injector) ?? [];

    return {
      component: UserUpdateFormFields,
      headerComponent: UserItemHeader,
      title: 'Edit user',
      key: UserUpdateForm.routePattern.build({ id }),
      pattern: UserUpdateForm.routePattern.pattern,
      data: (instance: UserUpdateFormFields) => ({
        entityLoader: service.select({ id }),
        formInterceptors,
        updateOperation: service.update,
        actions: [
          CodeListActions.backAction(() => instance.onClose({ success: false })),
          ...registrations.map(r => ({
            label: r.action?.label ?? '',
            description: r.action?.description,
            icon: r.action?.icon,
            action: () => instance.navigationContext.push(r.factory(params, injector))
          })),
          {
            label: 'Save',
            description: 'Save the item',
            icon: 'check_circle',
            action: () => instance.onSubmit()
          }
        ]
      }),
      childPages,
      pageFactory: (params) => UserUpdateForm.fromParams(params, injector)
    };
  }

  service = inject(UserService);
  injector = inject(Injector);
  navigationContext = inject(StackNavigationContext);
  private childPageProvider = inject(ChildPageProviderService, { optional: true });
  formInterceptors = input<FormGenerationInterceptors>();

  pageInfo = computed<StackPageInfo<CodeListUpdateForm<UpdateUserDto>> | undefined>(() => {
    if (!this.dto())
      return undefined;

    const userId = this.dto()!.id;
    const registrations = this.childPageProvider?.getRegistrations(UserUpdateFormFields) ?? [];

    return {
      component: CodeListUpdateForm,
      key: UserUpdateForm.routePattern.build({ id: `${userId}` }),
      data: {
        updateOperation: this.service.update,
        dto: this.dto()!,
        formInterceptors: this.formInterceptors(),
        actions: [
          CodeListActions.backAction(() => this.onClose({ success: false })),
          ...registrations.map(r => ({
            label: r.action?.label ?? '',
            description: r.action?.description,
            icon: r.action?.icon,
            action: () => this.navigationContext.push(r.factory({ id: userId.toString() }, this.injector))
          })),
          {
            label: 'Save',
            description: 'Save the item',
            icon: 'check_circle',
            action: () => this.onSubmit()
          }
        ]
      },
      outputs: {
        formClose: (result: FormResult) => this.onClose(result)
      }
    };
  });
}
