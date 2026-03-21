import type { RoleBlock } from '../types.js';

type RoleId = 'system' | 'user' | 'assistant' | 'unknown';

interface RawRole {
  role: RoleId;
  content: string;
  startOffset: number;
  endOffset: number;
}

const ROLE_MAP: Record<string, RoleId> = {
  system: 'system',
  'system prompt': 'system',
  user: 'user',
  human: 'user',
  assistant: 'assistant',
  ai: 'assistant',
};

function matchRole(label: string): RoleId | null {
  const normalized = label.trim().toLowerCase();
  return ROLE_MAP[normalized] ?? null;
}

/**
 * Detect role blocks in plain text using markdown headers, labels, and XML tags.
 */
export function detectRoles(text: string): RoleBlock[] {
  const roles: RawRole[] = [];

  // Try markdown headers: # System, ## System Prompt, etc.
  const headerPattern = /^(#{1,3})\s+(system(?:\s+prompt)?|user|human|assistant|ai)\s*$/gim;
  let match: RegExpExecArray | null;
  const headerPositions: Array<{ role: RoleId; startOffset: number; headerEnd: number }> = [];

  while ((match = headerPattern.exec(text)) !== null) {
    const role = matchRole(match[2]);
    if (role) {
      headerPositions.push({
        role,
        startOffset: match.index,
        headerEnd: match.index + match[0].length,
      });
    }
  }

  if (headerPositions.length > 0) {
    for (let i = 0; i < headerPositions.length; i++) {
      const pos = headerPositions[i];
      const contentStart = pos.headerEnd;
      const contentEnd = i + 1 < headerPositions.length
        ? headerPositions[i + 1].startOffset
        : text.length;
      const content = text.slice(contentStart, contentEnd).trim();
      roles.push({
        role: pos.role,
        content,
        startOffset: pos.startOffset,
        endOffset: contentEnd,
      });
    }
    return roles.map(r => ({ ...r, sections: [] }));
  }

  // Try XML tags: <system>, <user>, <assistant>
  const xmlPattern = /<(system|user|assistant)>([\s\S]*?)<\/\1>/gi;
  while ((match = xmlPattern.exec(text)) !== null) {
    const role = matchRole(match[1]);
    if (role) {
      roles.push({
        role,
        content: match[2].trim(),
        startOffset: match.index,
        endOffset: match.index + match[0].length,
      });
    }
  }
  if (roles.length > 0) {
    return roles.map(r => ({ ...r, sections: [] }));
  }

  // Try label patterns: System:, User:, etc. at start of line
  const labelPattern = /^(system|user|human|assistant|ai)\s*:\s*/gim;
  const labelPositions: Array<{ role: RoleId; startOffset: number; contentStart: number }> = [];

  while ((match = labelPattern.exec(text)) !== null) {
    const role = matchRole(match[1]);
    if (role) {
      labelPositions.push({
        role,
        startOffset: match.index,
        contentStart: match.index + match[0].length,
      });
    }
  }

  if (labelPositions.length > 0) {
    for (let i = 0; i < labelPositions.length; i++) {
      const pos = labelPositions[i];
      const contentEnd = i + 1 < labelPositions.length
        ? labelPositions[i + 1].startOffset
        : text.length;
      const content = text.slice(pos.contentStart, contentEnd).trim();
      roles.push({
        role: pos.role,
        content,
        startOffset: pos.startOffset,
        endOffset: contentEnd,
      });
    }
    return roles.map(r => ({ ...r, sections: [] }));
  }

  // No roles detected: treat entire text as implicit system role
  return [{
    role: 'system',
    content: text,
    startOffset: 0,
    endOffset: text.length,
    sections: [],
  }];
}
