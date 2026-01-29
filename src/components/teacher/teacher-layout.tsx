'use client';

import { TeacherSidebar, TeacherMobileNav } from './teacher-sidebar';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Desktop Sidebar */}
      <TeacherSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container max-w-5xl mx-auto px-4 py-6 lg:px-8 lg:py-8 pb-20 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <TeacherMobileNav />
    </div>
  );
}
