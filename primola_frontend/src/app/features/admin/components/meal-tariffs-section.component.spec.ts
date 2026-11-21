import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MealTariffsSectionComponent } from './meal-tariffs-section.component';
import { ApiService } from '../../../core/services/api.service';

describe('MealTariffsSectionComponent', () => {
  let component: MealTariffsSectionComponent;
  let mockApi: any;

  const activeTariff: any = {
    id: 'mt1',
    price: 5.5,
    valid_from: '2026-01-01',
    valid_to: '9999-12-31',
    notes: 'Standard'
  };

  beforeEach(() => {
    mockApi = {
      getMealTariffs: vi.fn().mockReturnValue(of({ active: activeTariff, history: [activeTariff] })),
      transitionMealTariff: vi.fn(),
      updateMealTariff: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        MealTariffsSectionComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(MealTariffsSectionComponent);
  });

  it('should load meal tariffs on init and handle error', () => {
    component.ngOnInit();
    expect(component.activeTariff()).toEqual(activeTariff);
    expect(component.history()).toHaveLength(1);
    expect(component.isLoading()).toBe(false);

    mockApi.getMealTariffs.mockReturnValue(throwError(() => new Error('fail')));
    component.loadMealTariffs();
    expect(component.alertType()).toBe('error');
    expect(component.isLoading()).toBe(false);
  });

  it('should open transition modal, compute old_valid_to, validate and submit', () => {
    component.ngOnInit();
    component.openTransitionModal();
    expect(component.showTransitionModal()).toBe(true);

    component.transitionForm.new_valid_from = '2026-12-01';
    component.onNewValidFromChange('2026-12-01');
    expect(component.transitionForm.old_valid_to).toBe('2026-11-30');

    // Invalid price
    component.transitionForm.new_price = -1;
    component.submitTransition();
    expect(component.modalError()).toContain('prezzo valido');

    // Invalid date order
    component.transitionForm.new_price = 6;
    component.transitionForm.old_valid_to = '2026-12-05';
    component.submitTransition();
    expect(component.modalError()).toContain('precedere');

    // Valid submit
    component.transitionForm.old_valid_to = '2026-11-30';
    mockApi.transitionMealTariff.mockReturnValue(of({}));
    component.submitTransition();
    expect(component.showTransitionModal()).toBe(false);
    expect(component.alertType()).toBe('success');

    // Error submit
    component.openTransitionModal();
    component.transitionForm.new_valid_from = '2026-12-01';
    component.transitionForm.old_valid_to = '2026-11-30';
    mockApi.transitionMealTariff.mockReturnValue(throwError(() => ({})));
    component.submitTransition();
    expect(component.modalError()).toContain('Errore durante la transizione');

    // Submit when activeTariff is null
    component.activeTariff.set(null);
    component.openTransitionModal();
    component.transitionForm.new_valid_from = '2026-12-01';
    mockApi.transitionMealTariff.mockReturnValue(of({}));
    component.submitTransition();
    expect(mockApi.transitionMealTariff).toHaveBeenCalledWith(
      expect.objectContaining({ old_tariff_id: null, old_valid_to: undefined })
    );
  });

  it('should open history modal, validate and save edited tariff', () => {
    component.openHistoryModal();
    expect(component.showHistoryModal()).toBe(true);

    component.startEditTariff(activeTariff);
    expect(component.editingTariffId()).toBe('mt1');

    component.editTariffForm.price = -5;
    component.saveEditTariff('mt1');
    expect(component.modalError()).toContain('obbligatori');

    component.editTariffForm.price = 6;
    component.editTariffForm.valid_from = '2026-12-10';
    component.editTariffForm.valid_to = '2026-12-01';
    component.saveEditTariff('mt1');
    expect(component.modalError()).toContain('successiva');

    component.editTariffForm.valid_to = '2026-12-31';
    mockApi.updateMealTariff.mockReturnValue(of({}));
    component.saveEditTariff('mt1');
    expect(component.editingTariffId()).toBeNull();
    expect(mockApi.updateMealTariff).toHaveBeenCalled();

    mockApi.updateMealTariff.mockReturnValue(throwError(() => ({})));
    component.saveEditTariff('mt1');
    expect(component.modalError()).toContain('Errore');
  });
});
