import { getLuvCharacterServer, getLuvConversationsServer } from '@/lib/luv-server';
import { ChatInterface } from '../components/chat-interface';

export default async function LuvChatPage() {
  const [character, conversations] = await Promise.all([
    getLuvCharacterServer(),
    getLuvConversationsServer(),
  ]);

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Chat Sandbox</h1>
      <ChatInterface
        soulData={character?.soul_data ?? {}}
        savedConversations={conversations}
      />
    </div>
  );
}
