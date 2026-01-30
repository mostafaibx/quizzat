import type { Module, Unit, Lesson } from '@/lib/rpc';

export interface ModuleWithUnits extends Module {
  units?: UnitWithLessons[];
}

export interface UnitWithLessons extends Unit {
  lessons?: Lesson[];
}

export type ModuleCardVariant = 'default' | 'compact';

export interface ModuleFormData {
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
}

export interface UnitFormData {
  title: string;
  description: string;
}

export interface LessonFormData {
  title: string;
  description: string;
  contentType: 'video' | 'text' | 'quiz' | 'assignment';
  isFree: boolean;
}
