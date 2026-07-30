import { create } from 'zustand';
import { Student } from '@/types/student.types';

interface StudentState {
  // State
  students: Student[];
  selectedStudent: Student | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions (placeholder)
  setStudents: (students: Student[]) => void;
  setSelectedStudent: (student: Student | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  reset: () => void;
}

const initialState = {
  students:        [],
  selectedStudent: null,
  isLoading:       false,
  error:           null,
  searchQuery:     '',
};

export const useStudentStore = create<StudentState>((set) => ({
  ...initialState,

  setStudents:        (students)        => set({ students }),
  setSelectedStudent: (selectedStudent) => set({ selectedStudent }),
  setLoading:         (isLoading)       => set({ isLoading }),
  setError:           (error)           => set({ error }),
  setSearchQuery:     (searchQuery)     => set({ searchQuery }),
  reset:              ()                => set(initialState),
}));
