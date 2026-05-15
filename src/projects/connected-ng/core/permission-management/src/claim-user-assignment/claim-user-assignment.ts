import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { Claim, ClaimService, CLAIM_UNDEFINED } from '@connected-ng/core/permissions';
import { UserService, UserSelectList, User } from '@connected-ng/core/users';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-claim-user-assignment',
  imports: [UserSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './claim-user-assignment.html',
  styleUrl: './claim-user-assignment.scss',
})
export class ClaimUserAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('users');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const claimValue = params['id'];
    return {
      component: ClaimUserAssignment,
      key: ClaimUserAssignment.routePattern.pattern,
      pattern: ClaimUserAssignment.routePattern.pattern,
      title: 'Users',
      data: { claimValue },
      pageFactory: (_p) => ClaimUserAssignment.fromParams(params, injector)
    };
  }

  claimValue = input<string>();

  private navigationContext = inject(StackNavigationContext);
  private userService = inject(UserService);
  private claimService = inject(ClaimService);
  private busyService = inject(BusyService);

  readonly busyKey = 'claim-user-assignment-save';
  readonly loadKey = 'claim-user-assignment-load';

  loaded = signal(false);
  selectedUserIds = signal<number[]>([]);

  private allUsers: User[] = [];
  private originalClaims: Claim[] = [];

  constructor() {
    effect(() => {
      const claimValue = this.claimValue();
      if (!claimValue) return;
      this.load(claimValue);
    });
  }

  private async load(claimValue: string) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const [users, claims] = await Promise.all([
        firstValueFrom(this.userService.query(undefined)),
        firstValueFrom(this.claimService.query({ schema: 'user', entity: CLAIM_UNDEFINED, entityId: CLAIM_UNDEFINED }))
      ]);
      this.allUsers = users ?? [];
      this.originalClaims = (claims ?? []).filter(c => c.value === claimValue);

      const selectedTokens = new Set(
        this.originalClaims.map(c => c.identity).filter((v): v is string => !!v)
      );
      this.selectedUserIds.set(
        this.allUsers.filter(u => selectedTokens.has(u.token)).map(u => u.id)
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
    const claimValue = this.claimValue();
    if (!claimValue) return;

    const originalTokens = new Set(
      this.originalClaims.map(c => c.identity).filter((v): v is string => !!v)
    );
    const current = new Set(this.selectedUserIds());
    const currentUsers = this.allUsers.filter(u => current.has(u.id));
    const currentTokens = new Set(currentUsers.map(u => u.token));

    const toAdd = currentUsers.filter(u => !originalTokens.has(u.token));
    const toRemove = this.originalClaims.filter(c => c.identity && !currentTokens.has(c.identity));

    await firstValueFrom(
      from(Promise.all([
        ...toAdd.map(user =>
          firstValueFrom(this.claimService.insert({
            value: claimValue,
            schema: 'user',
            identity: user.token,
            entity: CLAIM_UNDEFINED,
            entityId: CLAIM_UNDEFINED
          }))
        ),
        ...toRemove.map(c => firstValueFrom(this.claimService.delete({ id: c.id })))
      ])).pipe(this.busyService.track(this.busyKey))
    );

    this.navigationContext.back();
  }
}
