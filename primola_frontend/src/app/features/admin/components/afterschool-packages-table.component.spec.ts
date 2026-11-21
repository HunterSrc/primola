import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AfterschoolPackagesTableComponent } from './afterschool-packages-table.component';
import { ApiService } from '../../../core/services/api.service';
import { AfterschoolPackage, AfterschoolTariff } from '../../../core/models';

describe('AfterschoolPackagesTableComponent', () => {
  let component: AfterschoolPackagesTableComponent;
  let mockApi: any;

  const samplePkg: AfterschoolPackage = {
    id: 'pkg1',
    name: 'Pacchetto 4 Giorni',
    code: 'PKG4',
    monthly_days: 4,
    current_price: 60,
    current_tariff_id: 't1',
    is_active: true
  };

  const sampleInactivePkg: AfterschoolPackage = {
    id: 'pkg2',
    name: 'Pacchetto 2 Giorni',
    monthly_days: 2,
    current_price: undefined,
    is_active: false
  };

  beforeEach(() => {
    mockApi = {
      getAfterschoolPackages: vi.fn().mockReturnValue(of([samplePkg, sampleInactivePkg])),
      updateAfterschoolPackage: vi.fn(),
      transitionAfterschoolTariff: vi.fn(),
      createAfterschoolPackage: vi.fn(),
      getPackageTariffs: vi.fn().mockReturnValue(of([
        { id: 't1', package_id: 'pkg1', price: 60, valid_from: '2026-01-01', valid_to: '9999-01-01', notes: 'Tariffa base' }
      ]))
    };

    TestBed.configureTestingModule({
      providers: [
        AfterschoolPackagesTableComponent,
        { provide: ApiService, useValue: mockApi }
      ]
    });

    component = TestBed.inject(AfterschoolPackagesTableComponent);
  });

  it('should load packages on init and handle errors', () => {
    component.ngOnInit();
    expect(component.packages().length).toBe(2);
    expect(component.isLoading()).toBe(false);

    // Error with error message
    mockApi.getAfterschoolPackages.mockReturnValue(throwError(() => ({ error: { error: 'Impossibile caricare' } })));
    component.loadPackages();
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Impossibile caricare');
    expect(component.isLoading()).toBe(false);

    // Error with fallback message
    mockApi.getAfterschoolPackages.mockReturnValue(throwError(() => ({})));
    component.loadPackages();
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Errore nel caricamento dei pacchetti');
  });

  it('should edit package inline and handle update error or success', () => {
    component.packages.set([samplePkg, sampleInactivePkg]);
    component.startEditPackage(samplePkg);
    expect(component.editingPackageId()).toBe('pkg1');
    expect(component.editFormData.name).toBe('Pacchetto 4 Giorni');
    expect(component.editFormData.monthly_days).toBe(4);

    // Validation error when name is empty
    component.editFormData.name = '   ';
    component.savePackageEdit('pkg1');
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Il nome del pacchetto non può essere vuoto');

    // Error from API
    component.editFormData.name = 'Pacchetto 5 Giorni';
    mockApi.updateAfterschoolPackage.mockReturnValue(throwError(() => ({ error: { error: 'Nome duplicato' } })));
    component.savePackageEdit('pkg1');
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Nome duplicato');

    // Error from API fallback
    mockApi.updateAfterschoolPackage.mockReturnValue(throwError(() => ({})));
    component.savePackageEdit('pkg1');
    expect(component.alertMessage()).toBe('Errore durante il salvataggio del pacchetto');

    // Success (updates matching package and preserves non-matching package)
    mockApi.updateAfterschoolPackage.mockReturnValue(of({ name: 'Pacchetto 5 Giorni', monthly_days: 5 }));
    component.savePackageEdit('pkg1');
    expect(component.editingPackageId()).toBeNull();
    expect(component.alertType()).toBe('success');
    expect(component.packages()[0].name).toBe('Pacchetto 5 Giorni');
    expect(component.packages()[1].id).toBe('pkg2');

    // Cancel edit
    component.startEditPackage(samplePkg);
    component.cancelPackageEdit();
    expect(component.editingPackageId()).toBeNull();
  });

  it('should toggle package status between active and inactive, handling errors', () => {
    component.packages.set([samplePkg, sampleInactivePkg]);

    // Deactivate active package
    mockApi.updateAfterschoolPackage.mockReturnValue(of({ is_active: false }));
    component.togglePackageStatus(samplePkg);
    expect(component.packages()[0].is_active).toBe(false);
    expect(component.alertMessage()).toBe('Pacchetto disattivato');

    // Activate inactive package
    mockApi.updateAfterschoolPackage.mockReturnValue(of({ is_active: true }));
    component.togglePackageStatus(sampleInactivePkg);
    expect(component.packages()[1].is_active).toBe(true);
    expect(component.alertMessage()).toBe('Pacchetto attivato');

    // Error with message
    mockApi.updateAfterschoolPackage.mockReturnValue(throwError(() => ({ error: { error: 'Status non modificabile' } })));
    component.togglePackageStatus(samplePkg);
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Status non modificabile');

    // Error fallback
    mockApi.updateAfterschoolPackage.mockReturnValue(throwError(() => ({})));
    component.togglePackageStatus(samplePkg);
    expect(component.alertMessage()).toBe('Errore aggiornamento stato');
  });

  it('should open and close transition modal, and handle null current_price', () => {
    // With current_price
    component.openTransitionModal(samplePkg);
    expect(component.showTransitionModal()).toBe(true);
    expect(component.selectedPackage()).toEqual(samplePkg);
    expect(component.transitionForm.newPrice).toBe(60);

    component.closeTransitionModal();
    expect(component.showTransitionModal()).toBe(false);
    expect(component.selectedPackage()).toBeNull();

    // With undefined current_price
    component.openTransitionModal(sampleInactivePkg);
    expect(component.transitionForm.newPrice).toBe(0);
  });

  it('should validate and submit transition tariff, handling errors', () => {
    // If no package selected, do nothing
    component.selectedPackage.set(null);
    component.submitTransitionTariff();
    expect(mockApi.transitionAfterschoolTariff).not.toHaveBeenCalled();

    component.openTransitionModal(samplePkg);

    // Missing dates
    component.transitionForm.oldTariffValidTo = '';
    component.transitionForm.newTariffValidFrom = '2026-12-01';
    component.submitTransitionTariff();
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Le date di fine vecchia tariffa e inizio nuova tariffa sono obbligatorie');

    // old date >= new date
    component.transitionForm.oldTariffValidTo = '2026-12-05';
    component.transitionForm.newTariffValidFrom = '2026-12-01';
    component.submitTransitionTariff();
    expect(component.alertMessage()).toBe('La data di fine tariffa deve essere antecedente alla data di inizio della nuova tariffa');

    // newPrice < 0
    component.transitionForm.oldTariffValidTo = '2026-11-30';
    component.transitionForm.newTariffValidFrom = '2026-12-01';
    component.transitionForm.newPrice = -5;
    component.submitTransitionTariff();
    expect(component.alertMessage()).toBe('Il prezzo deve essere maggiore o uguale a 0');

    // API error with message
    component.transitionForm.newPrice = 75;
    component.transitionForm.notes = '  Aggiornamento inflazione  ';
    mockApi.transitionAfterschoolTariff.mockReturnValue(throwError(() => ({ error: { error: 'Transizione non permessa' } })));
    component.submitTransitionTariff();
    expect(component.isSubmitting()).toBe(false);
    expect(component.alertMessage()).toBe('Transizione non permessa');

    // API error fallback
    mockApi.transitionAfterschoolTariff.mockReturnValue(throwError(() => ({})));
    component.submitTransitionTariff();
    expect(component.alertMessage()).toBe('Errore durante la transizione della tariffa');

    // Success with empty notes
    component.transitionForm.notes = '   ';
    mockApi.transitionAfterschoolTariff.mockReturnValue(of({}));
    const loadSpy = vi.spyOn(component, 'loadPackages');
    component.submitTransitionTariff();
    expect(component.isSubmitting()).toBe(false);
    expect(component.showTransitionModal()).toBe(false);
    expect(component.alertMessage()).toBe('Nuova tariffa attivata con successo (valida fino al 01/01/9999)');
    expect(loadSpy).toHaveBeenCalled();
    expect(mockApi.transitionAfterschoolTariff).toHaveBeenCalledWith('pkg1', {
      oldTariffId: 't1',
      oldTariffValidTo: '2026-11-30',
      newPrice: 75,
      newTariffValidFrom: '2026-12-01',
      newTariffValidTo: '9999-01-01',
      notes: null
    });
  });

  it('should open, validate, and submit new package, handling errors and success', () => {
    component.openNewPackageModal();
    expect(component.showNewPackageModal()).toBe(true);

    // Missing name
    component.newPackageForm.name = '  ';
    component.submitNewPackage();
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Il nome del pacchetto è obbligatorio');

    // Negative monthly days
    component.newPackageForm.name = 'Pacchetto Custom';
    component.newPackageForm.monthly_days = -1;
    component.submitNewPackage();
    expect(component.alertMessage()).toBe('I valori numerici devono essere maggiori o uguali a 0');

    // Negative price
    component.newPackageForm.monthly_days = 5;
    component.newPackageForm.price = -10;
    component.submitNewPackage();
    expect(component.alertMessage()).toBe('I valori numerici devono essere maggiori o uguali a 0');

    // Missing valid_from
    component.newPackageForm.price = 50;
    component.newPackageForm.valid_from = '';
    component.submitNewPackage();
    expect(component.alertMessage()).toBe('La data di inizio validità è obbligatoria');

    // API error with message
    component.newPackageForm.valid_from = '2026-11-01';
    component.newPackageForm.code = '  CODE1  ';
    component.newPackageForm.notes = '  Nota pacchetto  ';
    mockApi.createAfterschoolPackage.mockReturnValue(throwError(() => ({ error: { error: 'Codice pacchetto già esistente' } })));
    component.submitNewPackage();
    expect(component.isSubmitting()).toBe(false);
    expect(component.alertMessage()).toBe('Codice pacchetto già esistente');

    // API error fallback
    mockApi.createAfterschoolPackage.mockReturnValue(throwError(() => ({})));
    component.submitNewPackage();
    expect(component.alertMessage()).toBe('Errore nella creazione del pacchetto');

    // Success with code and notes trimmed
    mockApi.createAfterschoolPackage.mockReturnValue(of({ id: 'pkg-new' }));
    const loadSpy = vi.spyOn(component, 'loadPackages');
    component.submitNewPackage();
    expect(component.isSubmitting()).toBe(false);
    expect(component.showNewPackageModal()).toBe(false);
    expect(component.alertMessage()).toBe('Nuovo pacchetto creato con successo');
    expect(loadSpy).toHaveBeenCalled();
    expect(mockApi.createAfterschoolPackage).toHaveBeenCalledWith({
      name: 'Pacchetto Custom',
      code: 'CODE1',
      monthly_days: 5,
      price: 50,
      valid_from: '2026-11-01',
      valid_to: '9999-01-01',
      notes: 'Nota pacchetto'
    });

    // Success with empty code and notes (evaluates || null branch)
    component.openNewPackageModal();
    component.newPackageForm = {
      name: 'Pacchetto Senza Note',
      code: '   ',
      monthly_days: 2,
      price: 30,
      valid_from: '2026-11-01',
      notes: '   '
    };
    component.submitNewPackage();
    expect(mockApi.createAfterschoolPackage).toHaveBeenCalledWith({
      name: 'Pacchetto Senza Note',
      code: null,
      monthly_days: 2,
      price: 30,
      valid_from: '2026-11-01',
      valid_to: '9999-01-01',
      notes: null
    });

    // Close modal
    component.openNewPackageModal();
    component.closeNewPackageModal();
    expect(component.showNewPackageModal()).toBe(false);
  });

  it('should view and close tariff history and handle history load errors', () => {
    // Success
    component.viewHistory(samplePkg);
    expect(mockApi.getPackageTariffs).toHaveBeenCalledWith('pkg1');
    expect(component.historyPackage()).toEqual(samplePkg);
    expect(component.tariffHistory().length).toBe(1);
    expect(component.showHistoryModal()).toBe(true);

    component.closeHistoryModal();
    expect(component.showHistoryModal()).toBe(false);
    expect(component.historyPackage()).toBeNull();

    // Error with message
    mockApi.getPackageTariffs.mockReturnValue(throwError(() => ({ error: { error: 'Tariffe non trovate' } })));
    component.viewHistory(samplePkg);
    expect(component.alertType()).toBe('error');
    expect(component.alertMessage()).toBe('Tariffe non trovate');

    // Error fallback
    mockApi.getPackageTariffs.mockReturnValue(throwError(() => ({})));
    component.viewHistory(samplePkg);
    expect(component.alertMessage()).toBe('Errore caricamento storico');
  });

  it('should clear alert after timeout only if message has not changed', () => {
    vi.useFakeTimers();

    // Case 1: Alert message has not changed
    component.showAlert('First Message', 'success');
    expect(component.alertMessage()).toBe('First Message');
    vi.advanceTimersByTime(4000);
    expect(component.alertMessage()).toBeNull();

    // Case 2: Alert message changed before timeout
    component.showAlert('Second Message', 'error');
    component.alertMessage.set('Third Message Overwritten');
    vi.advanceTimersByTime(4000);
    // Should NOT be reset to null because it does not equal 'Second Message'
    expect(component.alertMessage()).toBe('Third Message Overwritten');

    vi.useRealTimers();
  });
});
