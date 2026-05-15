import { Component, computed, inject, Injector, input } from '@angular/core';
import { UpdateRoleDto, Role } from '../../../services/roles/dtos/role-dtos';
import { RoleService } from '../../../services/roles/role-service';
import { CodeListActions, CodeListUpdateForm, CodeListUpdateFormBase } from '@connected-ng/components/code-lists';
import { hideField, localizeFields } from '@connected-ng/components/code-lists/helpers';
import { FormGenerationInterceptors, FormResult } from '@connected-ng/components/forms';
import { ChildPageProviderService, StackComponent, StackPageInfo } from '@connected-ng/components/navigation';
import { routePattern } from '@connected-ng/core';
import { RoleUpdateFormFields } from './role-update-form-fields/role-update-form-fields';
import { RoleItemHeader } from '../role-item-header/role-item-header';

@Component({
  selector: 'cn-role-update-form',
  imports: [StackComponent],
  template: CodeListUpdateFormBase.TEMPLATE,
  styleUrl: './role-update-form.scss',
})
export class RoleUpdateForm extends CodeListUpdateFormBase<UpdateRoleDto, Role> {
  static readonly routePattern = routePattern('edit/:id');

  static fieldLocalizer = localizeFields({
    'name': () => 'Name',
    'parent': () => 'Parent role',
  });

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const id = Number(params['id']);

    const formInterceptors: FormGenerationInterceptors = {
      fieldInterceptors: [
        hideField('id'),
        hideField('status'),
        this.fieldLocalizer,
      ]
    };

    const service = injector.get(RoleService);
    const childPageProvider = injector.get(ChildPageProviderService, null);
    const registrations = childPageProvider?.getRegistrations(RoleUpdateFormFields) ?? [];
    const childPages = childPageProvider?.createChildPages(RoleUpdateFormFields, params, injector) ?? [];

    return {
      component: RoleUpdateFormFields,
      headerComponent: RoleItemHeader,
      title: 'Edit role',
      key: RoleUpdateForm.routePattern.build({ id }),
      pattern: RoleUpdateForm.routePattern.pattern,
      data: registrations.length > 0
        ? (instance: RoleUpdateFormFields) => ({
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
        })
        : {
          entityLoader: service.select({ id }),
          formInterceptors,
          updateOperation: service.update
        },
      childPages,
      pageFactory: (params) => RoleUpdateForm.fromParams(params, injector)
    };
  }

  service = inject(RoleService);
  formInterceptors = input<FormGenerationInterceptors>();

  pageInfo = computed<StackPageInfo<CodeListUpdateForm<UpdateRoleDto>> | undefined>(() => {
    if (!this.dto())
      return undefined;

    return {
      component: CodeListUpdateForm,
      key: RoleUpdateForm.routePattern.build({ id: `${this.dto()!.id}` }),
      data: {
        updateOperation: this.service.update,
        dto: this.dto()!,
        formInterceptors: this.formInterceptors()
      },
      outputs: {
        formClose: (result: FormResult) => this.onClose(result)
      }
    };
  });
}

