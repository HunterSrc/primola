import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AfterschoolExpensesComponent } from './afterschool-expenses.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { of } from 'rxjs';
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

  it('should filter student meals by search query', () => {
    component.ngOnInit();
    component.searchStudentQuery = 'giulia';
    expect(component.filteredStudentsMensa().length).toBe(1);

    component.searchStudentQuery = 'sconosciuto';
    expect(component.filteredStudentsMensa().length).toBe(0);
  });

  it('should create and update an afterschool expense via modal', () => {
    component.ngOnInit();
    component.openNewExpenseModal();
    expect(component.showExpenseModal()).toBe(true);
    expect(component.editingExpenseId()).toBeNull();

    // Validation error when amount is 0
    component.expenseForm.amount = 0;
    component.submitExpenseModal();
    expect(component.expenseModalError()).toBeTruthy();
    expect(mockApi.createAfterschoolExpense).not.toHaveBeenCalled();

    // Valid creation
    component.expenseForm = {
      expense_date: '2026-10-15',
      category: 'MENSA',
      amount: 150,
      description: 'Seconda fattura mensa'
    };
    component.submitExpenseModal();
    expect(mockApi.createAfterschoolExpense).toHaveBeenCalledWith({
      expense_date: '2026-10-15',
      category: 'MENSA',
      amount: 150,
      description: 'Seconda fattura mensa'
    });
    expect(component.showExpenseModal()).toBe(false);

    // Edit existing expense
    const existing = mockExpensesResponse.expenses[0];
    component.openEditExpenseModal(existing);
    expect(component.editingExpenseId()).toBe('exp-1');
    component.expenseForm.amount = 350;
    component.submitExpenseModal();
    expect(mockApi.updateAfterschoolExpense).toHaveBeenCalledWith('exp-1', {
      expense_date: '2026-10-10',
      category: 'MENSA',
      amount: 350,
      description: 'Fattura catering ottobre'
    });
  });
});
