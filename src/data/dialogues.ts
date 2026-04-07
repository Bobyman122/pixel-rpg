import { DialogueScript } from '@/types';

export const DIALOGUES: Record<string, DialogueScript> = {
  elder_quest: {
    id: 'elder_quest',
    lines: {
      start: {
        speaker: 'Elder Rowan',
        text: 'Kael, thank heavens you are here! The Crystal of Light has been stolen!',
        nextId: 'explain',
      },
      explain: {
        speaker: 'Elder Rowan',
        text: 'A dark knight appeared in the night and took it to Shadowfang Cave, east through the Whispering Forest.',
        nextId: 'ask',
      },
      ask: {
        speaker: 'Elder Rowan',
        text: 'Without the crystal, darkness will consume our village. Will you retrieve it?',
        choices: [
          { text: 'I will bring it back!', nextId: 'accept' },
          { text: 'That sounds dangerous...', nextId: 'encourage' },
        ],
        nextId: null,
      },
      accept: {
        speaker: 'Elder Rowan',
        text: 'Brave soul! Speak with Lira at her house to the southeast - her magic will aid you. And visit the shop for supplies!',
        nextId: null,
        setFlag: 'quest_accepted',
      },
      encourage: {
        speaker: 'Elder Rowan',
        text: 'I know it is frightening, but you are the strongest warrior in our village. Lira and others will help you. Please, we have no one else!',
        nextId: 'accept',
      },
    },
    startLineId: 'start',
  },

  lira_recruit: {
    id: 'lira_recruit',
    lines: {
      start: {
        speaker: 'Lira',
        text: "You must be Kael. The Elder told me about the stolen crystal. I'm a mage - my fire and healing spells will be useful.",
        nextId: 'offer',
      },
      offer: {
        speaker: 'Lira',
        text: 'Let me join you on this quest!',
        choices: [
          { text: 'Welcome aboard!', nextId: 'join', flag: 'lira_joined' },
          { text: 'Not right now.', nextId: 'wait' },
        ],
        nextId: null,
      },
      join: {
        speaker: 'Lira',
        text: "Great! I've packed my staff and spellbook. Let's head east through the forest. Be careful - monsters roam those woods.",
        nextId: null,
        setFlag: 'lira_joined',
      },
      wait: {
        speaker: 'Lira',
        text: "I'll be here when you're ready. Don't wait too long though - the darkness grows stronger!",
        nextId: null,
      },
      already_joined: {
        speaker: 'Lira',
        text: "Let's keep moving! The cave is through the forest to the east.",
        nextId: null,
        requireFlag: 'lira_joined',
      },
    },
    startLineId: 'start',
  },

  finn_recruit: {
    id: 'finn_recruit',
    lines: {
      start: {
        speaker: 'Finn',
        text: "Hey! Watch out! These woods are crawling with monsters. Name's Finn - I'm a... freelance treasure hunter.",
        nextId: 'explain',
      },
      explain: {
        speaker: 'Finn',
        text: "I heard there's something valuable in Shadowfang Cave to the east. That's where you're headed too, right?",
        nextId: 'offer',
      },
      offer: {
        speaker: 'Finn',
        text: "How about we team up? Safety in numbers and all that. Plus I'm pretty handy with a blade!",
        choices: [
          { text: "Sure, join us!", nextId: 'join', flag: 'finn_joined' },
          { text: "We'll manage.", nextId: 'reject' },
        ],
        nextId: null,
      },
      join: {
        speaker: 'Finn',
        text: "Excellent! You won't regret it. I know a few tricks - poison blades, smoke bombs... the fun stuff. The cave entrance is to the east!",
        nextId: null,
        setFlag: 'finn_joined',
      },
      reject: {
        speaker: 'Finn',
        text: "Your loss! I'll be around if you change your mind. These goblins aren't exactly friendly.",
        nextId: null,
      },
    },
    startLineId: 'start',
  },

  shopkeeper: {
    id: 'shopkeeper',
    lines: {
      start: {
        speaker: 'Merchant',
        text: 'Welcome to my shop! Stock up before your journey. Potions are essential for the road ahead!',
        nextId: 'hint',
      },
      hint: {
        speaker: 'Merchant',
        text: "(Tip: Items can be used in battle through the 'Items' command. Potions restore 30 HP!)",
        nextId: null,
      },
    },
    startLineId: 'start',
  },

  innkeeper: {
    id: 'innkeeper',
    lines: {
      start: {
        speaker: 'Innkeeper',
        text: 'You look tired from your travels. Would you like to rest? It will restore your HP and MP.',
        choices: [
          { text: 'Yes, please.', nextId: 'rest' },
          { text: 'No thanks.', nextId: 'decline' },
        ],
        nextId: null,
      },
      rest: {
        speaker: 'Innkeeper',
        text: 'Sweet dreams! ...Your party has been fully healed!',
        nextId: null,
        setFlag: '_heal_party',
      },
      decline: {
        speaker: 'Innkeeper',
        text: 'Come back anytime you need rest!',
        nextId: null,
      },
    },
    startLineId: 'start',
  },

  villager_generic: {
    id: 'villager_generic',
    lines: {
      start: {
        speaker: 'Villager',
        text: 'Ever since the crystal was stolen, strange shadows have been creeping closer to the village at night...',
        nextId: 'tip',
      },
      tip: {
        speaker: 'Villager',
        text: "If you're heading to the forest, watch out for wolves. They're fast but weak to magic!",
        nextId: null,
      },
    },
    startLineId: 'start',
  },

  dark_knight_boss: {
    id: 'dark_knight_boss',
    lines: {
      start: {
        speaker: 'Dark Knight',
        text: 'So, the villagers sent their little heroes to stop me? How... amusing.',
        nextId: 'taunt',
      },
      taunt: {
        speaker: 'Dark Knight',
        text: 'This crystal belongs to my master now. Its light will fuel the darkness that consumes this land!',
        nextId: 'challenge',
      },
      challenge: {
        speaker: 'Dark Knight',
        text: 'If you want it back, you will have to pry it from my cold, armored hands. Prepare yourselves!',
        nextId: null,
        setFlag: '_boss_fight',
      },
    },
    startLineId: 'start',
  },
};
