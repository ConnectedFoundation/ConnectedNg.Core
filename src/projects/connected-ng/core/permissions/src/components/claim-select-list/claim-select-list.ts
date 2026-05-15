import { Component, effect, inject, input, model, output, signal } from '@angular/core';
import { CodeListLinkForm } from '@connected-ng/components/code-lists';
import { BusyIndicatorStructuralDirective, BusyService } from '@connected-ng/components/indicators';
import { ClaimDescriptor, CLAIM_UNDEFINED } from '../../services/claims/dtos/claim-dtos';
import { ClaimSchemaService } from '../../services/claims/claims-schema-service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'cn-claim-select-list',
  imports: [CodeListLinkForm, BusyIndicatorStructuralDirective],
  templateUrl: './claim-select-list.html',
  styleUrl: './claim-select-list.scss',
})
export class ClaimSelectList {
  private claimSchemaService = inject(ClaimSchemaService);
  private busyService = inject(BusyService);

  entity = input<string>();
  entityId = input<string>();

  selectedValues = model<string[]>([]);
  itemSelected = output<ClaimDescriptor>();
  itemDeselected = output<ClaimDescriptor>();

  readonly loadKey = 'claim-select-list-load';

  items = signal<ClaimDescriptor[]>([]);
  loaded = signal(false);

  constructor() {
    effect(() => {
      const entity = this.entity();
      const entityId = this.entityId();
      if (entity && entityId) {
        this.load(entity, entityId);
      }
    });
  }

  private async load(entity: string, entityId: string) {
    this.loaded.set(false);
    this.busyService.setBusy(this.loadKey, true);
    try {
      const descriptors = await firstValueFrom(this.claimSchemaService.queryDescriptors({ entity: CLAIM_UNDEFINED, entityId: CLAIM_UNDEFINED }));
      this.items.set(descriptors ?? []);
      this.loaded.set(true);
    } finally {
      this.busyService.setBusy(this.loadKey, false);
    }
  }
}
