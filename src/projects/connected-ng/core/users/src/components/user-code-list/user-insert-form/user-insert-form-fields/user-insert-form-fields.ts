import { Component } from '@angular/core';
import { CodeListInsertForm } from "@connected-ng/components/code-lists";
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicFormFieldComponent } from "@connected-ng/components/forms";
import { ActionsProviderContract } from '@connected-ng/components/navigation';
import { User } from '../../../../services/users/dtos/user-dtos';

@Component({
  selector: 'cn-user-insert-form-fields',
  imports: [ReactiveFormsModule, DynamicFormFieldComponent],
  templateUrl: './user-insert-form-fields.html',
  styleUrl: './user-insert-form-fields.scss',
})
export class UserInsertFormFields extends CodeListInsertForm<User> implements ActionsProviderContract {
  firstName = this.field('firstName');
  lastName = this.field('lastName');
  email = this.field('email');
}
