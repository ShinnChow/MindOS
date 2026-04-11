export interface ObsidianCommunityFixture {
  pluginId: string;
  displayName: string;
  source: string;
  code: string;
  styles?: string;
  expectedCompatibilityLevel: 'compatible' | 'partial' | 'blocked';
}

export const OBSIDIAN_COMMUNITY_FIXTURES: ObsidianCommunityFixture[] = [
  {
    pluginId: 'style-settings-like',
    displayName: 'Style Settings-like',
    source: 'https://github.com/obsidian-community/obsidian-style-settings',
    expectedCompatibilityLevel: 'compatible',
    styles: '.theme-accent { color: var(--amber); }',
    code: `
      const { Plugin, PluginSettingTab, Setting } = require('obsidian');
      class StyleSettingsTab extends PluginSettingTab {
        display() {
          new Setting(this)
            .setName('Theme accent')
            .addDropdown((dropdown) => dropdown.addOption('amber', 'Amber').setValue('amber'));
        }
      }
      module.exports = class StyleSettingsLike extends Plugin {
        onload() {
          this.addSettingTab(new StyleSettingsTab(this.app));
        }
      };
    `,
  },
  {
    pluginId: 'quickadd-like',
    displayName: 'QuickAdd-like',
    source: 'https://publish.obsidian.md/quickadd/ManualInstallation',
    expectedCompatibilityLevel: 'compatible',
    code: `
      const { Plugin, Modal, Notice } = require('obsidian');
      class CaptureModal extends Modal {}
      module.exports = class QuickAddLike extends Plugin {
        async onload() {
          await this.saveData({ macros: [] });
          this.addCommand({
            id: 'capture',
            name: 'Capture',
            callback: () => new Notice('captured')
          });
        }
      };
    `,
  },
  {
    pluginId: 'tag-wrangler-like',
    displayName: 'Tag Wrangler-like',
    source: 'https://publish.obsidian.md/hub/02+-+Community+Expansions/02.05+All+Community+Expansions/Plugins/tag-wrangler',
    expectedCompatibilityLevel: 'compatible',
    code: `
      const { Plugin, Notice } = require('obsidian');
      module.exports = class TagWranglerLike extends Plugin {
        onload() {
          this.addCommand({
            id: 'rename-tag',
            name: 'Rename Tag',
            callback: () => {
              this.app.metadataCache.getCache('notes/example.md');
              new Notice('renamed');
            }
          });
        }
      };
    `,
  },
  {
    pluginId: 'homepage-like',
    displayName: 'Homepage-like',
    source: 'https://www.obsidianstats.com/plugins/homepage',
    expectedCompatibilityLevel: 'compatible',
    code: `
      const { Plugin } = require('obsidian');
      module.exports = class HomepageLike extends Plugin {
        onload() {
          this.addCommand({
            id: 'open-homepage',
            name: 'Open Homepage',
            callback: () => this.app.workspace.openLinkText('Home', '')
          });
        }
      };
    `,
  },
];
