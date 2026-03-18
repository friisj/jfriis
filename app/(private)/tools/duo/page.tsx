import { DuoClient } from './duo-client';

export const metadata = {
  title: 'DUO — Browser Synthesizer',
  description: 'Collaborative two-sided synth inspired by the Dato DUO',
};

export default function DuoPage() {
  return (
    <div className="h-full relative">
      <DuoClient />
    </div>
  );
}
