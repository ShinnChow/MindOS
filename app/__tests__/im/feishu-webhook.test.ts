import { describe, it, expect } from 'vitest';
import type { FeishuConfig, FeishuWebhookEventEnvelope } from '@/lib/im/types';

import {
  buildFeishuWebhookStatus,
  normalizeFeishuIncomingMessage,
  shouldProcessFeishuEvent,
} from '@/lib/im/webhook/feishu';

describe('Feishu webhook helpers', () => {
  it('builds pending status when conversation is enabled but public url is missing', () => {
    const config: FeishuConfig = {
      app_id: 'cli_xxx',
      app_secret: 'secret',
      conversation: {
        enabled: true,
        encrypt_key: 'encrypt',
      },
    };

    expect(buildFeishuWebhookStatus(config)).toEqual({
      platform: 'feishu',
      state: 'pending',
      publicBaseUrl: undefined,
      webhookUrl: undefined,
      lastError: 'Public base URL is required for Feishu event callbacks.',
    });
  });

  it('builds ready status when conversation is enabled and callback URL is available', () => {
    const config: FeishuConfig = {
      app_id: 'cli_xxx',
      app_secret: 'secret',
      conversation: {
        enabled: true,
        encrypt_key: 'encrypt',
        public_base_url: 'https://mindos.example.com',
      },
    };

    expect(buildFeishuWebhookStatus(config)).toEqual({
      platform: 'feishu',
      state: 'ready',
      publicBaseUrl: 'https://mindos.example.com',
      webhookUrl: 'https://mindos.example.com/api/im/webhook/feishu',
      lastError: undefined,
    });
  });

  it('normalizes a dm text message into the shared incoming message shape', () => {
    const payload: FeishuWebhookEventEnvelope = {
      header: {
        event_type: 'im.message.receive_v1',
      },
      event: {
        sender: {
          sender_id: { open_id: 'ou_sender_123' },
        },
        message: {
          message_id: 'om_message_001',
          chat_id: 'oc_chat_001',
          chat_type: 'p2p',
          content: JSON.stringify({ text: '你好，MindOS' }),
        },
      },
    };

    expect(normalizeFeishuIncomingMessage(payload)).toEqual({
      platform: 'feishu',
      senderId: 'ou_sender_123',
      senderName: undefined,
      chatId: 'oc_chat_001',
      chatType: 'dm',
      text: '你好，MindOS',
      messageId: 'om_message_001',
      threadId: undefined,
      mentionsBot: false,
      rawEvent: payload,
    });
  });

  it('processes direct messages even without mentions', () => {
    const payload: FeishuWebhookEventEnvelope = {
      event: {
        message: {
          chat_type: 'p2p',
          content: JSON.stringify({ text: 'hello' }),
        },
      },
    };

    expect(shouldProcessFeishuEvent(payload)).toEqual({ ok: true, reason: 'direct_message' });
  });

  it('ignores group messages without bot mentions', () => {
    const payload: FeishuWebhookEventEnvelope = {
      event: {
        message: {
          chat_type: 'group',
          content: JSON.stringify({ text: 'hello everyone' }),
          mentions: [],
        },
      },
    };

    expect(shouldProcessFeishuEvent(payload)).toEqual({ ok: false, reason: 'group_without_mention' });
  });
});
