export type ChannelType = 'WHATSAPP' | 'WEB_WIDGET' | 'INSTAGRAM' | 'TELEGRAM' | 'EMAIL';

export type Role = 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER';

export type ConversationStatus = 
  | 'BOT_ACTIVE' 
  | 'HANDOFF_QUEUED' 
  | 'AGENT_ACTIVE' 
  | 'RESOLVED' 
  | 'CLOSED';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export type MessageContentType = 
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'INTERACTIVE_BUTTONS'
  | 'LIST_MENU'
  | 'TEMPLATE'
  | 'LOCATION';
