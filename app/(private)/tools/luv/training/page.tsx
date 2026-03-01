import { getLuvTrainingSetsServer } from '@/lib/luv-server';
import { TrainingManager } from '../components/training-manager';

export default async function LuvTrainingPage() {
  const trainingSets = await getLuvTrainingSetsServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Training Sets</h1>
      <TrainingManager initialTrainingSets={trainingSets} />
    </div>
  );
}
