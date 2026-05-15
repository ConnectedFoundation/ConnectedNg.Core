import { Component, computed, inject, Injector } from '@angular/core';
import { CodeListInsertForm, CodeListInsertFormBase } from '@connected-ng/components/code-lists';
import { localizeFields } from '@connected-ng/components/code-lists/helpers';
import { routePattern } from '@connected-ng/core';
import { StackComponent, StackPageInfo } from '@connected-ng/components/navigation';
import { FormGenerationInterceptors, FormResult } from '@connected-ng/components/forms';
import { UserInsertFormFields } from './user-insert-form-fields/user-insert-form-fields';
import { InsertUserDto } from '../../../services/users/dtos/user-dtos';
import { UserService } from '../../../services/users/user-service';

@Component({
  selector: 'cn-user-insert-form',
  imports: [StackComponent],
  template: CodeListInsertFormBase.TEMPLATE,
  styleUrl: './user-insert-form.scss',
})
export class UserInsertForm extends CodeListInsertFormBase<InsertUserDto> {
  /**
     * Route pattern for this component.
     */
  static readonly routePattern = routePattern('new');

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
    let service = injector.get(UserService);

    const formInterceptors: FormGenerationInterceptors = {
      fieldInterceptors: [
        this.fieldLocalizer
      ]
    };

    return {
      component: UserInsertFormFields,
      title: 'New user',
      key: UserInsertForm.routePattern.pattern,
      pattern: UserInsertForm.routePattern.pattern,
      data: {
        serviceOperation: service.insert,
        title: 'New user',
        formInterceptors: formInterceptors
      },
      pageFactory: (params) => UserInsertForm.fromParams(params, injector)
    };
  }

  service = inject(UserService);

  pageInfo = computed<StackPageInfo<CodeListInsertForm<InsertUserDto>>>(() => {
    const formInterceptors: FormGenerationInterceptors = {
      fieldInterceptors: [
        UserInsertForm.fieldLocalizer
      ]
    };

    return {
      component: UserInsertFormFields,
      key: `new`,
      data: {
        serviceOperation: this.service.insert,
        formInterceptors: formInterceptors
      },
      outputs: {
        formClose: (result: FormResult) => this.onClose(result)
      }
    };
  });
}
