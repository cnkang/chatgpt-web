import type {
	Chat as SharedChat,
	ChatState as SharedChatState,
	ConversationRequest as SharedConversationRequest,
	ConversationResponse as SharedConversationResponse,
	History as SharedHistory,
} from '@chatgpt-web/shared'

declare namespace Chat {
	// Re-export shared types for backward compatibility
	interface Chat extends SharedChat {}
	interface History extends SharedHistory {}
	interface ChatState extends SharedChatState {}
	interface ConversationRequest extends SharedConversationRequest {}
	interface ConversationResponse extends SharedConversationResponse {}
}
