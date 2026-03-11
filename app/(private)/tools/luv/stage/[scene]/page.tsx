import { StagePlayer } from '../components/stage-player';

interface Props {
  params: Promise<{ scene: string }>;
}

export default async function SceneViewerPage({ params }: Props) {
  const { scene } = await params;

  return <StagePlayer initialSceneSlug={scene} />;
}
