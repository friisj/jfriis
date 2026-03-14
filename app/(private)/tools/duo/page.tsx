import { DuoSynth } from './components/duo-synth';

export const metadata = {
  title: 'DUO — Browser Synthesizer',
  description: 'Collaborative two-sided synth inspired by the Dato DUO',
};

export default function DuoPage() {
  return (
    <div className="h-[calc(100vh-3rem)]">
      <DuoSynth />
    </div>
  );
}
