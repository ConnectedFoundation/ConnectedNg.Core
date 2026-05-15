import { Component, computed, effect, inject, Injector, input, signal } from '@angular/core';
import { routePattern } from '@connected-ng/core';
import { ActionDescriptionWithAction } from '@connected-ng/components';
import { CodeListActions } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ActionsProviderContract, StackNavigationContext, StackPageInfo } from '@connected-ng/components/navigation';
import { Claim, ClaimService, CLAIM_UNDEFINED } from '@connected-ng/core/permissions';
import { ClaimSelectList } from '@connected-ng/core/permissions';
import { UserService } from '@connected-ng/core/users';
import { firstValueFrom, from } from 'rxjs';

@Component({
  selector: 'cn-user-claim-assignment',
  imports: [ClaimSelectList, BusyIndicatorStructuralDirective],
  templateUrl: './user-claim-assignment.html',
  styleUrl: './user-claim-assignment.scss',
})
export class UserClaimAssignment implements ActionsProviderContract {
  static readonly routePattern = routePattern('claims');

  static fromParams(params: Record<string, string>, injector: Injector): StackPageInfo<unknown> {
    const userId = Number(params['id']);
    return {
      component: UserClaimAssignment,
      key: UserClaimAssignment.routePattern.pattern,
      pattern: UserClaimAssignment.routePattern.pattern,
      title: 'Claims',
      data: { userId },
      pageFactory: (_p) => UserClaimAssignment.fromParams(params, injector)
    };
  }

  userId = input<number>();

  private navigationContext = inject(StackNavigationContext);
  private claimService = inject(ClaimService);
  private userService = inject(UserService);
  private busyService = inject(BusyService);

  readonly busyKey = 'user-claim-assignment-save';
  readonly loadKey = 'user-claim-assignment-load';

  loaded = signal(false);
  selectedClaimValues = signal<string[]>([]);
  entityId = computed(() => this.userId()?.toString() ?? '');

  private originalClaims: Claim[] = [];
  private userToken: string | undefined;

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
      this.userToken = user.token;
      const claims = await firstValueFrom(
        this.claimService.query({ schema: 'user', identity: user.token, entity: CLAIM_UNDEFINED, entityId: CLAIM_UNDEFINED })
      );
      this.originalClaims = claims ?? [];
      this.selectedClaimValues.set(this.originalClaims.map(c => c.value));
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
    const userId = this.userId();
    if (!userId) return;

    const original = new Set(this.originalClaims.map(c => c.value));
    const current = new Set(this.selectedClaimValues());

    const toAdd = [...current].filter(v => !original.has(v));
    const toRemove = this.originalClaims.filter(c => !current.has(c.value));

    firstValueFrom(
      from(Promise.all([
        ...toAdd.map(value =>
          firstValueFrom(this.claimService.insert({
            value,
            schema: 'user',
            identity: this.userToken!,
            entity: CLAIM_UNDEFINED,
            entityId: CLAIM_UNDEFINED
          }))
        ),
        ...toRemove.map(c =>
          firstValueFrom(this.claimService.delete({ id: c.id }))
        )
      ])).pipe(this.busyService.track(this.busyKey))
    ).then(() => this.navigationContext.back());
  }
}
