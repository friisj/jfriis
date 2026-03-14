import { DuoClient } from './duo-client';

export const metadata = {
  title: 'DUO — Browser Synthesizer',
  description: 'Collaborative two-sided synth inspired by the Dato DUO',
};

export default function DuoPage() {
  return (
    <div className="h-[calc(100vh-3rem)]">
      <DuoClient />
    </div>
  );
}
