import { notFound } from 'next/navigation';
import { getStudyBySlugServer, getChassisModulesServer } from '@/lib/luv-chassis-server';
import { StudyEditor } from '../../components/study-editor';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StudyDetailPage({ params }: Props) {
  const { slug } = await params;
  const [study, modules] = await Promise.all([
    getStudyBySlugServer(slug),
    getChassisModulesServer(),
  ]);

  if (!study) {
    notFound();
  }

  return (
    <div className="container px-4 py-8 max-w-xl">
      <h2 className="text-sm font-semibold mb-4">{study.title}</h2>
      <StudyEditor study={study} modules={modules} />
    </div>
  );
}
