// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AgentsContentChannelDetail from '@/components/agents/AgentsContentChannelDetail';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('@/lib/stores/locale-store', () => ({
  useLocale: () => ({
    locale: 'en',
    t: {
      panels: {
        im: {
          emptyDesc: 'Connect messaging platforms to let MindOS send messages on your behalf.',
          backToChannels: 'Back to Channels',
          statusConnected: 'Connected',
          notConfigured: 'Set up',
          fetchError: 'Failed to load channel status.',
          thisIsNotChat: 'This is a delivery channel, not a chat inbox.',
          retry: 'Retry',
          howItWorks: 'How it works',
          currentMode: 'Current mode',
          notificationsOnly: 'Notifications only',
          twoWayConversation: 'Two-way conversation',
          conversationTitle: 'Conversation',
          conversationEnable: 'Allow messages from Feishu',
          conversationWaiting: 'Waiting for verification',
          conversationReady: 'Ready for replies',
          conversationDisabled: 'Disabled',
          conversationNeedsPublicUrl: 'Public URL required',
          conversationNeedsEncryptKey: 'Encrypt Key required',
          conversationHint: 'Users can DM the bot, and group messages only trigger when the bot is mentioned.',
          conversationConfigHint: 'Turn this on after you have a reachable public URL and your Feishu Encrypt Key ready.',
          conversationWebhookUrl: 'Webhook URL',
          conversationCopyUrl: 'Copy URL',
          conversationStatus: 'Webhook status',
          conversationReachability: 'Reachability',
          conversationReachabilityHint: 'Feishu must be able to reach this URL from the public internet.',
          conversationOpenPlatform: 'Open Feishu console',
          conversationPublicBaseUrl: 'Public base URL',
          conversationEncryptKey: 'Encrypt Key',
          conversationVerificationToken: 'Verification Token',
          conversationVerificationTokenHint: 'Used for Feishu webhook challenge verification. Leave blank to keep the saved value.',
          conversationSecretPlaceholder: 'Leave blank to keep saved value',
          conversationGroupMentions: 'Only reply when mentioned in groups',
          conversationSaved: 'Conversation settings saved',
          conversationSave: 'Save conversation settings',
          workInMindosHint: 'Use Ask in MindOS to work with the agent. Use this channel to receive updates, alerts, and sample messages.',
          useCasesTitle: 'What you can receive',
          guideLink: 'Open setup guide',
          statusSummaryTitle: 'Status summary',
          lastActivity: 'Last activity',
          lastRecipient: 'Last recipient',
          tabStatus: 'Status',
          notAvailable: 'Not available',
          latestSuccess: 'Latest success',
          latestFailure: 'Latest failure',
          noRecentActivity: 'No recent activity',
          activityTypeTest: 'Sample message',
          activityTypeAgent: 'Agent update',
          activityTypeManual: 'Manual send',
          recentActivity: 'Recent activity',
          noActivityYet: 'No messages sent yet',
          noActivityHint: 'Send a sample message to verify this channel is working.',
          sendSample: 'Send sample notification',
          sampleHint: 'This sends a real outbound message through the selected channel.',
          recipientPlaceholder: 'Recipient ID',
          recipientHint: 'Use the platform-specific recipient ID.',
          messagePlaceholder: 'Hello from MindOS',
          sentOk: 'Sent successfully',
          settingsTitle: 'Settings',
          settingsHint: 'Maintain credentials and channel settings here.',
          editCredentials: 'Update credentials',
          editCredentialsHint: 'Need to rotate tokens or fix a broken connection? Update and save here.',
          savedValuesHint: 'Saved values stay hidden. To update credentials, paste the full replacement values and save.',
          required: 'required',
          hideSecret: 'Hide value',
          showSecret: 'Show value',
          saving: 'Saving...',
          saveConfig: 'Save',
          saved: 'Saved — reconnecting...',
          disconnect: 'Disconnect',
          disconnectHint: 'Remove credentials and disconnect this platform.',
          confirmDisconnect: 'Confirm?',
          setupGuide: 'Setup Guide',
          tabConfigure: 'Configure',
        },
      },
    },
  }),
}));

describe('AgentsContentChannelDetail redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders a connected channel as a management page with activity and settings', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/im/status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            platforms: [{ platform: 'feishu', connected: true, botName: 'MindOS Bot', capabilities: ['text', 'markdown'], webhook: { state: 'ready', webhookUrl: 'https://mindos.example.com/api/im/webhook/feishu', publicBaseUrl: 'https://mindos.example.com' } }],
          }),
        });
      }
      if (url.includes('/api/im/activity')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            activities: [{
              id: 'a1',
              platform: 'feishu',
              type: 'test',
              status: 'success',
              recipient: 'ou_123456',
              messageSummary: 'Hello from MindOS',
              timestamp: '2026-04-10T10:00:00.000Z',
            }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<AgentsContentChannelDetail platformId="feishu" />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(host.textContent).toContain('How it works');
    expect(host.textContent).toContain('Conversation');
    expect(host.textContent).toContain('Ready for replies');
    expect(host.textContent).toContain('Two-way conversation');
    expect(host.textContent).toContain('Recent activity');
    expect(host.textContent).toContain('Send sample notification');
    expect(host.textContent).toContain('Settings');
    expect(host.textContent).toContain('This is a delivery channel, not a chat inbox.');

    await act(async () => {
      root.unmount();
    });
  });

  it('renders a verification token field for Feishu conversation setup', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/im/status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            platforms: [{ platform: 'feishu', connected: true, botName: 'MindOS Bot', capabilities: ['text', 'markdown'], webhook: { state: 'ready', webhookUrl: 'https://mindos.example.com/api/im/webhook/feishu', publicBaseUrl: 'https://mindos.example.com' } }],
          }),
        });
      }
      if (url.includes('/api/im/activity')) {
        return Promise.resolve({ ok: true, json: async () => ({ activities: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<AgentsContentChannelDetail platformId="feishu" />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Verification Token');
    expect(host.textContent).toContain('Leave blank to keep the saved value');

    await act(async () => {
      root.unmount();
    });
  });

  it('renders an unconfigured channel as setup flow instead of activity page', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('/api/im/status')) {
        return Promise.resolve({ ok: true, json: async () => ({ platforms: [] }) });
      }
      if (url.includes('/api/im/activity')) {
        return Promise.resolve({ ok: true, json: async () => ({ activities: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<AgentsContentChannelDetail platformId="telegram" />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(host.textContent).toContain('Setup Guide');
    expect(host.textContent).toContain('Configure');
    expect(host.textContent).not.toContain('Recent activity');
    expect(host.textContent).not.toContain('Send sample notification');

    await act(async () => {
      root.unmount();
    });
  });
});
