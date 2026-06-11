// Service Boards Types

export interface ServiceBoard {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  member_count?: number;
  card_count?: number;
  members?: ServiceBoardMember[];
}

export interface ServiceBoardMember {
  id: string;
  tenant_id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface ServiceList {
  id: string;
  tenant_id: string;
  board_id: string;
  name: string;
  position_numeric: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  cards?: ServiceCard[];
}

export interface ServiceCard {
  id: string;
  tenant_id: string;
  board_id: string;
  list_id: string;
  title: string;
  description: string | null;
  position_numeric: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  status: 'open' | 'in_progress' | 'review' | 'done' | 'blocked';
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  labels?: ServiceLabel[];
  members?: ServiceCardMember[];
  checklist_count?: number;
  comment_count?: number;
  attachment_count?: number;
  chat_link?: ServiceChatMessageLink | null;
}

export interface ServiceCardMember {
  id: string;
  tenant_id: string;
  card_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ServiceLabel {
  id: string;
  tenant_id: string;
  board_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ServiceCardLabel {
  id: string;
  tenant_id: string;
  card_id: string;
  label_id: string;
  created_at: string;
  label?: ServiceLabel;
}

export interface ServiceComment {
  id: string;
  tenant_id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ServiceChecklist {
  id: string;
  tenant_id: string;
  card_id: string;
  title: string;
  position_numeric: number;
  created_at: string;
  items?: ServiceChecklistItem[];
}

export interface ServiceChecklistItem {
  id: string;
  tenant_id: string;
  checklist_id: string;
  content: string;
  is_done: boolean;
  position_numeric: number;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
}

export interface ServiceAttachment {
  id: string;
  tenant_id: string;
  card_id: string;
  file_url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ServiceCardActivity {
  id: string;
  tenant_id: string;
  card_id: string;
  user_id: string;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ServiceChatMessageLink {
  id: string;
  tenant_id: string;
  card_id: string;
  room_id: string;
  chat_message_id: string;
  created_by: string;
  created_at: string;
}

// Form/Input types
export interface CreateBoardInput {
  name: string;
  description?: string;
}

export interface CreateListInput {
  board_id: string;
  name: string;
  position_numeric?: number;
}

export interface CreateCardInput {
  board_id: string;
  list_id: string;
  title: string;
  description?: string;
  priority?: ServiceCard['priority'];
  due_date?: string;
  assigned_to?: string;
}

export interface MoveCardInput {
  card_id: string;
  target_list_id: string;
  new_position: number;
}

export interface CreateCommentInput {
  card_id: string;
  content: string;
}

export interface CreateChecklistInput {
  card_id: string;
  title: string;
}

export interface CreateChecklistItemInput {
  checklist_id: string;
  content: string;
}

// Fractional indexing helper
export function calculatePosition(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return after! / 2;
  if (after === null) return before + 1;
  return (before + after) / 2;
}
