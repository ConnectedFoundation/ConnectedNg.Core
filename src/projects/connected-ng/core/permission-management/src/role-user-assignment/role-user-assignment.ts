import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { MembershipService, Membership } from '@connected-ng/core/permissions';
import { UserService, UserSelectList, User } from '@connected-ng/core/users';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-role-user-assignment',
  imports: [UserSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './role-user-assignment.html',
  styleUrl: './role-user-assignment.scss',
})
export class RoleUserAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('users');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const roleId = Number(params['id']);
    return {
      component: RoleUserAssignment,
      key: RoleUserAssignment.routePattern.pattern,
      pattern: RoleUserAssignment.routePattern.pattern,
      title: 'Users',
      data: { roleId },
      pageFactory: (_p) => RoleUserAssignment.fromParams(params, injector)
    };
  }

  roleId = input<number>();

  private navigationContext = inject(StackNavigationContext);
  private userService = inject(UserService);
  private membershipService = inject(MembershipService);
  private busyService = inject(BusyService);

  readonly busyKey = 'role-user-assignment-save';
  readonly loadKey = 'role-user-assignment-load';

  loaded = signal(false);
  selectedUserIds = signal<number[]>([]);

  private allUsers: User[] = [];
  private originalMemberships: Membership[] = [];

  constructor() {
    effect(() => {
      const roleId = this.roleId();
      if (!roleId) return;
      this.load(roleId);
    });
  }

  private async load(roleId: number) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const [users, memberships] = await Promise.all([
        firstValueFrom(this.userService.query(undefined)),
        firstValueFrom(this.membershipService.query({ role: roleId }))
      ]);

      this.allUsers = users ?? [];
      this.originalMemberships = memberships ?? [];

      const tokenToId = new Map(this.allUsers.map(u => [u.token, u.id]));
      this.selectedUserIds.set(
        this.originalMemberships
          .map(m => tokenToId.get(m.identity))
          .filter((id): id is number => id != null)
      );
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
    const roleId = this.roleId();
    if (!roleId) return;

    const idToUser = new Map(this.allUsers.map(u => [u.id, u]));
    const original = new Set(
      this.originalMemberships
        .map(m => this.allUsers.find(u => u.token === m.identity)?.id)
        .filter((id): id is number => id != null)
    );
    const current = new Set(this.selectedUserIds());

    const toAdd = [...current].filter(id => !original.has(id));
    const toRemove = this.originalMemberships.filter(m => {
      const user = this.allUsers.find(u => u.token === m.identity);
      return user && !current.has(user.id);
    });

    firstValueFrom(
      from(Promise.all([
        ...toAdd.map(userId => {
          const user = idToUser.get(userId);
          return user
            ? firstValueFrom(this.membershipService.insert({ identity: user.token, role: roleId }))
            : Promise.resolve(null);
        }),
        ...toRemove.map(m =>
          firstValueFrom(this.membershipService.delete({ id: m.id }))
        )
      ])).pipe(this.busyService.track(this.busyKey))
    ).then(() => this.navigationContext.back());
  }
}
