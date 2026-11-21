import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AfterschoolExpensesComponent } from './afterschool-expenses.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { AfterschoolExpense, AfterschoolExpensesSummary, MensaReport } from '../../core/models';

describe('AfterschoolExpensesComponent', () => {
  let component: AfterschoolExpensesComponent;
  let mockApi: any;
  let mockAuth: any;

  const mockExpensesResponse: {
    expenses: AfterschoolExpense[];
    summary: AfterschoolExpensesSummary;
  } = {
    summary: {
      total_mensa: 320,
      total_altro: 45.5,
      total_expenses: 365.5,
      count: 2
    },
    expenses: [
      {
        id: 'exp-1',
        expense_date: '2026-10-10',
        category: 'MENSA',
        amount: 320,
        description: 'Fattura catering ottobre'
      },
      {
        id: 'exp-2',
        expense_date: '2026-10-12',
        category: 'ALTRO',
        amount: 45.5,
        description: 'Materiale cancelleria'
      }
    ]
  };

  const mockMensaReport: MensaReport = {
    from: '2026-10-01',
    to: '2026-10-31',
    total_meals: 10,
    regular_meals: 10,
    extra_meals: 0,
    delivered_regular: 10,
    delivered_extra: 0,
    expected_meals: 10,
    breakdown: [],
    students_breakdown: [
      {
        student_id: 1,
        first_name: 'Giulia',
        last_name: 'Verdi',
        student_name: 'Giulia Verdi',
        school: 'Scuola Rodari',
        weekly_meals: 3,
        expected_meals: 10,
        delivered_regular: 10,
        delivered_extra: 0,
        delivered_total: 10
      },
      {
        student_id: 2,
        first_name: 'Mario',
        last_name: 'Rossi',
        student_name: 'Mario Rossi',
        weekly_meals: 0,
        expected_meals: 0,
        delivered_regular: 0,
        delivered_extra: 0,
        delivered_total: 0
      }
    ]
  };

  beforeEach(() => {
    mockApi = {
      getAfterschoolExpenses: vi.fn().mockReturnValue(of(mockExpensesResponse)),
      getMensaReport: vi.fn().mockReturnValue(of(mockMensaReport)),
      createAfterschoolExpense: vi.fn().mockReturnValue(of({ id: 'exp-new', expense_date: '2026-10-15', category: 'MENSA', amount: 150 })),
      updateAfterschoolExpense: vi.fn().mockReturnValue(of({ id: 'exp-1', expense_date: '2026-10-10', category: 'MENSA', amount: 350 })),
      deleteAfterschoolExpense: vi.fn().mockReturnValue(of(true))
    };

    mockAuth = {
      isAdmin: vi.fn().mockReturnValue(true),
      isOffice: vi.fn().mockReturnValue(false),
      canManageUsers: vi.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        AfterschoolExpensesComponent,
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth }
      ]
    });

    component = TestBed.inject(AfterschoolExpensesComponent);
  });

  it('should initialize and load mensa & expenses data', () => {
    component.ngOnInit();
    expect(mockApi.getAfterschoolExpenses).toHaveBeenCalled();
    expect(mockApi.getMensaReport).toHaveBeenCalled();
    expect(component.expenses().length).toBe(2);
    expect(component.summary().total_expenses).toBe(365.5);
    expect(component.mensaReport()?.total_meals).toBe(10);
  });

  it('should handle null response when loading expenses and fallback gracefully', () => {
    mockApi.getAfterschoolExpenses.mockReturnValue(of(null));
    component.loadExpenses();
    expect(component.expenses()).toEqual([]);
    expect(component.summary()).toEqual({ total_mensa: 0, total_altro: 0, total_expenses: 0, count: 0 });
    expect(component.loadingExpenses()).toBe(false);
  });

  it('should handle errors when loading expenses or mensa report', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockApi.getAfterschoolExpenses.mockReturnValue(throwError(() => new Error('Expenses load failed')));
    component.loadExpenses();
    expect(component.loadingExpenses()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Errore caricamento note spese doposcuola:', expect.any(Error));

    mockApi.getMensaReport.mockReturnValue(throwError(() => new Error('Mensa load failed')));
    component.loadMensaReport();
    expect(consoleSpy).toHaveBeenCalledWith('Errore caricamento report mensa:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should filter afterschool expenses by category (ALL, MENSA, ALTRO)', () => {
    component.ngOnInit();
    expect(component.filteredExpenses().length).toBe(2);

    component.categoryFilter.set('MENSA');
    expect(component.filteredExpenses().length).toBe(1);
    expect(component.filteredExpenses()[0].category).toBe('MENSA');

    component.categoryFilter.set('ALTRO');
    expect(component.filteredExpenses().length).toBe(1);
    expect(component.filteredExpenses()[0].category).toBe('ALTRO');
  });

  it('should filter student meals by first name, last name, and school', () => {
    component.ngOnInit();

    // Empty query returns all
    component.searchStudentQuery = '   ';
    expect(component.filteredStudentsMensa().length).toBe(2);

    // Search by first name
    component.searchStudentQuery = 'giulia';
    expect(component.filteredStudentsMensa().length).toBe(1);
    expect(component.filteredStudentsMensa()[0].student_id).toBe(1);

    // Search by last name
    component.searchStudentQuery = 'rossi';
    expect(component.filteredStudentsMensa().length).toBe(1);
    expect(component.filteredStudentsMensa()[0].student_id).toBe(2);

    // Search by school
    component.searchStudentQuery = 'rodari';
    expect(component.filteredStudentsMensa().length).toBe(1);
    expect(component.filteredStudentsMensa()[0].student_id).toBe(1);

    // Search with no match
    component.searchStudentQuery = 'sconosciuto';
    expect(component.filteredStudentsMensa().length).toBe(0);

    // When mensaReport is null
    component.mensaReport.set(null);
    expect(component.filteredStudentsMensa()).toEqual([]);
  });

  it('should set default date properly for current month vs another month', () => {
    // Current month/year
    component.openNewExpenseModal();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    expect(component.expenseForm.expense_date).toBe(todayStr);

    // Past/Future month
    component.selectedYear = 2024;
    component.selectedMonth = 5;
    component.openNewExpenseModal();
    expect(component.expenseForm.expense_date).toBe('2024-05-01');
  });

  it('should validate form and show errors on submit', () => {
    component.openNewExpenseModal();

    // Missing expense_date
    component.expenseForm.expense_date = '';
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBe('Seleziona la data della spesa.');

    // Amount null
    component.expenseForm.expense_date = '2026-10-15';
    component.expenseForm.amount = null;
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBe('Inserisci un valore in euro valido maggiore di 0.');

    // Amount undefined
    component.expenseForm.amount = undefined as any;
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBe('Inserisci un valore in euro valido maggiore di 0.');

    // Amount 0 or negative
    component.expenseForm.amount = -10;
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBe('Inserisci un valore in euro valido maggiore di 0.');

    // Amount NaN
    component.expenseForm.amount = 'abc' as any;
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBe('Inserisci un valore in euro valido maggiore di 0.');
  });

  it('should create an expense without description and handle API errors', () => {
    component.openNewExpenseModal();
    component.expenseForm = {
      expense_date: '2026-10-15',
      category: 'ALTRO',
      amount: 80,
      description: ''
    };

    // Error with error message
    mockApi.createAfterschoolExpense.mockReturnValue(throwError(() => ({ error: { error: 'Spesa non valida' } })));
    component.submitExpenseModal();
    expect(component.savingExpense()).toBe(false);
    expect(component.expenseModalError()).toBe('Spesa non valida');

    // Error fallback
    mockApi.createAfterschoolExpense.mockReturnValue(throwError(() => ({})));
    component.submitExpenseModal();
    expect(component.savingExpense()).toBe(false);
    expect(component.expenseModalError()).toBe('Errore durante il salvataggio della nota spesa.');
  });

  it('should create and update an afterschool expense successfully', () => {
    component.ngOnInit();
    component.openNewExpenseModal();
    expect(component.showExpenseModal()).toBe(true);
    expect(component.editingExpenseId()).toBeNull();

    // Valid creation
    component.expenseForm = {
      expense_date: '2026-10-15',
      category: 'MENSA',
      amount: 150.555,
      description: '  Seconda fattura mensa  '
    };
    component.submitExpenseModal();
    expect(mockApi.createAfterschoolExpense).toHaveBeenCalledWith({
      expense_date: '2026-10-15',
      category: 'MENSA',
      amount: 150.56,
      description: 'Seconda fattura mensa'
    });
    expect(component.showExpenseModal()).toBe(false);

    // Edit existing expense with empty description
    const existing: AfterschoolExpense = {
      id: 'exp-1',
      expense_date: '2026-10-10',
      category: 'MENSA',
      amount: 320
    };
    component.openEditExpenseModal(existing);
    expect(component.editingExpenseId()).toBe('exp-1');
    expect(component.expenseForm.description).toBe('');
    component.expenseForm.amount = 350;
    component.submitExpenseModal();
    expect(mockApi.updateAfterschoolExpense).toHaveBeenCalledWith('exp-1', {
      expense_date: '2026-10-10',
      category: 'MENSA',
      amount: 350,
      description: ''
    });

    // Close modal
    component.closeExpenseModal();
    expect(component.showExpenseModal()).toBe(false);
  });

  it('should delete expense when confirmed for MENSA and ALTRO categories', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const loadSpy = vi.spyOn(component, 'loadExpenses');

    const mensaExpense: AfterschoolExpense = {
      id: 'exp-1',
      expense_date: '2026-10-10',
      category: 'MENSA',
      amount: 320
    };

    const altroExpense: AfterschoolExpense = {
      id: 'exp-2',
      expense_date: '2026-10-12',
      category: 'ALTRO',
      amount: 45.5
    };

    // User cancels deletion
    confirmSpy.mockReturnValue(false);
    component.deleteExpense(mensaExpense);
    expect(mockApi.deleteAfterschoolExpense).not.toHaveBeenCalled();

    // User confirms deletion for MENSA
    confirmSpy.mockReturnValue(true);
    component.deleteExpense(mensaExpense);
    expect(mockApi.deleteAfterschoolExpense).toHaveBeenCalledWith('exp-1');
    expect(loadSpy).toHaveBeenCalled();

    // User confirms deletion for ALTRO
    component.deleteExpense(altroExpense);
    expect(mockApi.deleteAfterschoolExpense).toHaveBeenCalledWith('exp-2');

    confirmSpy.mockRestore();
  });

  it('should handle error when deleting expense', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const expense: AfterschoolExpense = {
      id: 'exp-1',
      expense_date: '2026-10-10',
      category: 'MENSA',
      amount: 100
    };

    // With error.error
    mockApi.deleteAfterschoolExpense.mockReturnValue(throwError(() => ({ error: { error: 'Eliminazione fallita' } })));
    component.deleteExpense(expense);
    expect(alertSpy).toHaveBeenCalledWith('Eliminazione fallita');

    // With fallback error
    mockApi.deleteAfterschoolExpense.mockReturnValue(throwError(() => ({})));
    component.deleteExpense(expense);
    expect(alertSpy).toHaveBeenCalledWith("Errore durante l'eliminazione della nota spesa.");

    confirmSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
