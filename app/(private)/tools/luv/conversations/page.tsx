import { getLuvConversationsServer } from '@/lib/luv-server';
import { ConversationHistory } from '../components/conversation-history';

export default async function LuvChatPage() {
  const conversations = await getLuvConversationsServer();

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Conversations</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Saved chat sessions. Use the chat drawer to start new conversations
        from any page.
      </p>
      <ConversationHistory conversations={conversations} />
    </div>
  );
}
