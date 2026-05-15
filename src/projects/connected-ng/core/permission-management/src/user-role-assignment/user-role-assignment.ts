import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { MembershipService, Membership, RoleSelectList } from '@connected-ng/core/permissions';
import { UserService } from '@connected-ng/core/users';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-user-role-assignment',
  imports: [RoleSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './user-role-assignment.html',
  styleUrl: './user-role-assignment.scss',
})
export class UserRoleAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('roles');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const userId = Number(params['id']);
    return {
      component: UserRoleAssignment,
      key: UserRoleAssignment.routePattern.pattern,
      pattern: UserRoleAssignment.routePattern.pattern,
      title: 'Roles',
      data: { userId },
      pageFactory: (_p) => UserRoleAssignment.fromParams(params, injector)
    };
  }

  userId = input<number>();

  private navigationContext = inject(StackNavigationContext);
  private userService = inject(UserService);
  private membershipService = inject(MembershipService);
  private busyService = inject(BusyService);

  readonly busyKey = 'user-role-assignment-save';
  readonly loadKey = 'user-role-assignment-load';

  loaded = signal(false);
  selectedRoleIds = signal<number[]>([]);

  private userIdentity: string | undefined;
  private originalMemberships: Membership[] = [];

  constructor() {
    effect(() => {
      const userId = this.userId();
      if (!userId) return;
      this.load(userId);
    });
  }

  private async load(userId: number) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const user = await firstValueFrom(this.userService.select({ id: userId }));
      if (!user) return;

      this.userIdentity = user.token;

      const memberships = await firstValueFrom(
        this.membershipService.query({ identity: user.token })
      );

      this.originalMemberships = memberships ?? [];
      this.selectedRoleIds.set(this.originalMemberships.map(m => m.role));
      this.loaded.set(true);
    } finally {
      this.busyService.setBusy(this.loadKey, false);
    }
  }

  pageActions = computed<ActionDescriptionWithAction[]>(() => [
    CodeListActions.backAction(() => { this.navigationContext.back(); }),
    {
      label: 'Save',
      description: 'Save current state',
      icon: 'check_circle',
      action: () => { this.save(); }
    }
  ]);

  private async save() {
    if (!this.userIdentity) return;

    const original = new Set(this.originalMemberships.map(m => m.role));
    const current = new Set(this.selectedRoleIds());

    const toAdd = [...current].filter(r => !original.has(r));
    const toRemove = this.originalMemberships.filter(m => !current.has(m.role));

    firstValueFrom(
      from(Promise.all([
        ...toAdd.map(roleId =>
          firstValueFrom(this.membershipService.insert({ identity: this.userIdentity!, role: roleId }))
        ),
        ...toRemove.map(m =>
          firstValueFrom(this.membershipService.delete({ id: m.id }))
        )
      ])).pipe(this.busyService.track(this.busyKey))
    ).then(() => this.navigationContext.back());
  }
}
