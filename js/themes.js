/**
 * Site theme registry.
 * Add new themes here — each maps a hostname pattern to animals, speech, and behaviors.
 *
 * Future hooks:
 * - Replace `emoji` with `sprite: 'assets/linkedin/pigeon.png'`
 * - Add `dialogueSource: 'ai'` for AI-generated speech
 * - Add `collectible: true` for pet collection
 * - Add `interactions: ['chase', 'high-five']` between animals
 */

const PLAYGROUND_THEMES = {
  linkedin: {
    id: 'linkedin',
    name: 'Corporate Park',
    hostPatterns: ['linkedin.com'],
    accent: '#0a66c2',
    spawnCount: 3,
    animals: [
      {
        id: 'business-pigeon',
        name: 'Business Pigeon',
        emoji: '🕊️',
        accessory: '👔',
        size: 52,
        behaviors: ['wander', 'sit-on-cards', 'wave', 'sleep-near-experience'],
      },
      {
        id: 'resume-raccoon',
        name: 'Resume Raccoon',
        emoji: '🦝',
        accessory: '📄',
        size: 48,
        behaviors: ['wander', 'sit-on-cards', 'wave'],
      },
      {
        id: 'coffee-hamster',
        name: 'Coffee Hamster',
        emoji: '🐹',
        accessory: '☕',
        size: 44,
        behaviors: ['wander', 'idle', 'sleep-near-experience'],
      },
    ],
    speech: [
      'another thrilled to announce...',
      'corporate npc detected',
      'promotion acquired',
      'networking side quest',
      'synergy unlocked',
      'open to work (emotionally)',
      'let me circle back on that',
    ],
    anchors: {
      profileCards: [
        '.artdeco-card',
        '.feed-shared-update-v2',
        '.profile-card',
        '[data-view-name="profile-card"]',
        '.scaffold-finite-scroll__content > div',
      ],
      experience: [
        '#experience',
        '[data-field="experience"]',
        'section:has(#experience)',
        '#experience ~ *',
      ],
    },
  },

  github: {
    id: 'github',
    name: 'Bug Forest',
    hostPatterns: ['github.com'],
    accent: '#238636',
    spawnCount: 3,
    animals: [
      {
        id: 'bug-goblin',
        name: 'Bug Goblin',
        emoji: '👺',
        accessory: '🐛',
        size: 50,
        behaviors: ['wander', 'hide-behind-code', 'pop-out', 'run-conflicts'],
      },
      {
        id: 'debug-octopus',
        name: 'Sleep Deprived Octopus',
        emoji: '🐙',
        accessory: '💤',
        size: 54,
        behaviors: ['wander', 'hide-behind-code', 'idle'],
      },
      {
        id: 'debug-frog',
        name: 'Debug Frog',
        emoji: '🐸',
        accessory: '🔍',
        size: 46,
        behaviors: ['wander', 'pop-out', 'run-conflicts', 'wave'],
      },
    ],
    speech: [
      'bug detected',
      "don't push to main",
      'LGTM',
      'works on my machine',
      'merge conflict speedrun',
      'it\'s not a bug, it\'s a feature',
      'have you tried turning it off and on again?',
    ],
    anchors: {
      repos: [
        '[data-testid="repository-content"]',
        '.repo-list-item',
        '.Box-row',
        'article',
      ],
      codeBlocks: [
        '.highlight',
        '.blob-code',
        'pre',
        '.react-code-text',
        'table.highlight',
      ],
      conflicts: [
        '.conflict-gutter',
        '.CodeMirror-merge-gap',
        '[data-conflict]',
      ],
    },
  },

  youtube: {
    id: 'youtube',
    name: 'Brainrot Playground',
    hostPatterns: ['youtube.com'],
    accent: '#ff0000',
    spawnCount: 2,
    animals: [
      {
        id: 'hyper-bird',
        name: 'Hyper Bird',
        emoji: '🐦',
        accessory: '⚡',
        size: 48,
        behaviors: ['jump-comments', 'wander', 'throw-emoji', 'wave'],
      },
      {
        id: 'meme-goblin',
        name: 'Meme Goblin',
        emoji: '👹',
        accessory: '🔥',
        size: 52,
        behaviors: ['jump-comments', 'float-thumbnails', 'throw-emoji', 'wander'],
      },
    ],
    speech: [
      'no thoughts head empty',
      'algorithm blessed',
      'one more video i swear',
      'ratio + L + you fell off',
      'this goes hard',
      'chat is this real',
      'POV: you found this at 3am',
    ],
    emojiReactions: ['🔥', '💀', '😭', '👀', '💯', '🗿', '✨', '😂'],
    anchors: {
      comments: [
        '#comments',
        'ytd-comments#comments',
        '#content ytd-comment-thread-renderer',
        'ytd-comment-thread-renderer',
      ],
      thumbnails: [
        'ytd-thumbnail',
        '#thumbnail',
        'a#thumbnail',
        'ytd-rich-item-renderer',
        'ytd-grid-video-renderer',
      ],
    },
  },
};

/**
 * Resolve theme from current hostname.
 * @param {string} hostname
 * @returns {object|null}
 */
function getThemeForHost(hostname) {
  const host = hostname.replace(/^www\./, '').toLowerCase();
  for (const theme of Object.values(PLAYGROUND_THEMES)) {
    if (theme.hostPatterns.some((pattern) => host.includes(pattern))) {
      return theme;
    }
  }
  return null;
}

// Expose for content script modules (no bundler)
window.PlaygroundThemes = { PLAYGROUND_THEMES, getThemeForHost };
