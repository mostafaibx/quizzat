import { LessonEditor } from '@/components/teacher';

interface LessonPageProps {
  params: Promise<{
    moduleId: string;
    unitId: string;
    lessonId: string;
  }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { moduleId, unitId, lessonId } = await params;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <LessonEditor
        moduleId={moduleId}
        unitId={unitId}
        lessonId={lessonId}
      />
    </div>
  );
}
