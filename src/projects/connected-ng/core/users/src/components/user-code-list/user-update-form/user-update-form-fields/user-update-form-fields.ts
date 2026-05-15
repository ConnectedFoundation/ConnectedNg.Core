import { Component, computed, effect, inject, Injector, InputSignal, signal, WritableSignal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { CodeListActions, CodeListUpdateForm } from "@connected-ng/components/code-lists";
import { DynamicFormFieldComponent } from "@connected-ng/components/forms";
import { ActionsProviderContract } from "@connected-ng/components/navigation";
import { User } from "../../../../public-api";
import { ActionDescriptionWithAction } from "@connected-ng/components";

@Component({
  selector: 'cn-user-update-form-fields',
  imports: [ReactiveFormsModule, DynamicFormFieldComponent],
  templateUrl: './user-update-form-fields.html',
  styleUrl: './user-update-form-fields.scss',
})
export class UserUpdateFormFields extends CodeListUpdateForm<User> implements ActionsProviderContract {
  firstName = this.field('firstName');
  lastName = this.field('lastName');
  email = this.field('email');
}
