import { ModuleEditor } from '@/components/teacher';

interface ModulePageProps {
  params: Promise<{
    moduleId: string;
  }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { moduleId } = await params;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <ModuleEditor moduleId={moduleId} />
    </div>
  );
}
