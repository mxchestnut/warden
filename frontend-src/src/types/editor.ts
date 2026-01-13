/**
 * TipTap editor types for React components
 */

import { Editor } from '@tiptap/react';

/**
 * TipTap JSON content structure
 */
export interface TipTapContent {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapContent[];
  text?: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
}

/**
 * Editor update event
 */
export interface EditorUpdateEvent {
  editor: Editor;
  transaction?: any;
}

/**
 * Editor change handler
 */
export type EditorChangeHandler = (content: TipTapContent | string) => void;

/**
 * TipTap editor props
 */
export interface TipTapEditorProps {
  content?: TipTapContent | string;
  onContentChange?: EditorChangeHandler;
  placeholder?: string;
  editable?: boolean;
  readOnly?: boolean;
  className?: string;
}

/**
 * Character value types (for use in forms)
 */
export type CharacterValueType = string | number | boolean | Record<string, any>;
