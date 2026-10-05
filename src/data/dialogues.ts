import type { DialogueScript } from '@/types';

const BOSS_BATTLE = {
  type: 'battle' as const,
  battle: {
    enemies: ['dark_knight'],
    boss: true,
    music: 'boss',
    backdrop: 'lair' as const,
    canRun: false,
    victory: { flags: ['boss_defeated'], dialogue: 'knight_defeated' },
  },
};

export const DIALOGUES: Record<string, DialogueScript> = {
  elder_quest: {
    id: 'elder_quest',
    start: 'a',
    lines: {
      a: { speaker: 'Elder Rowan', text: "Kael! Thank the stars you're here. Something terrible happened last night.", next: 'b' },
      b: {
        speaker: 'Elder Rowan',
        text: 'A knight in black armor broke into the shrine and took the Crystal of Light. Just walked out with it.',
        next: 'c',
      },
      c: {
        speaker: 'Elder Rowan',
        text: 'Our hunters followed his tracks east, through the Whispering Forest, all the way to Shadowfang Cave.',
        next: 'd',
      },
      d: {
        speaker: 'Elder Rowan',
        text: "Without that crystal, the shadows will swallow Millbrook within days. Will you bring it home?",
        choices: [
          { text: "I'll get it back.", next: 'accept' },
          { text: 'Why me?', next: 'why' },
        ],
      },
      why: {
        speaker: 'Elder Rowan',
        text: "Because you've never once backed away from a fight you knew was right. And, honestly... because there's no one else.",
        next: 'd',
      },
      accept: {
        speaker: 'Elder Rowan',
        text: "Bless you. Lira, the young mage who lives by the inn, has been itching for an adventure. Take her along.",
        action: { type: 'setFlag', flag: 'quest_accepted' },
        next: 'tips',
      },
      tips: {
        speaker: 'Elder Rowan',
        text: "And stop by Bram's shop before you go. Gold won't do you any good in a monster's belly.",
      },
    },
  },

  elder_waiting: {
    id: 'elder_waiting',
    start: 'a',
    lines: {
      a: {
        speaker: 'Elder Rowan',
        text: 'The forest lies east of the village, and the cave beyond it. Be careful, Kael. Come back to us.',
      },
    },
  },

  elder_ending: {
    id: 'elder_ending',
    start: 'a',
    lines: {
      a: { speaker: 'Elder Rowan', text: "Kael! You're back... and is that... is that the Crystal of Light?", next: 'b' },
      b: { speaker: 'Elder Rowan', text: 'Look at it shine. The shadows are already pulling back from the hills.', next: 'c' },
      c: {
        speaker: 'Elder Rowan',
        text: "Millbrook owes you everything. Tonight, we celebrate. Tomorrow... well. Tomorrow can wait.",
        action: { type: 'ending' },
      },
    },
  },

  lira_before: {
    id: 'lira_before',
    start: 'a',
    lines: {
      a: {
        speaker: 'Lira',
        text: "Oh, Kael! Have you seen the elder? He's been pacing around the plaza all morning. Something about the shrine...",
      },
    },
  },

  lira_recruit: {
    id: 'lira_recruit',
    start: 'a',
    lines: {
      a: { speaker: 'Lira', text: "So it's true. The crystal's really gone.", next: 'b' },
      b: {
        speaker: 'Lira',
        text: "You're going after it, aren't you? Take me with you. My fire spells could use a real target for once.",
        choices: [
          { text: 'Glad to have you.', next: 'join' },
          { text: "It's too dangerous.", next: 'refuse' },
        ],
      },
      refuse: {
        speaker: 'Lira',
        text: "Dangerous? I've been setting things on fire since I was six. ...Fine. You know where to find me.",
      },
      join: { text: 'Lira joined the party!', action: { type: 'join', characterId: 'lira' }, next: 'after' },
      after: { speaker: 'Lira', text: "East through the forest, right? Let's go before I lose my nerve." },
    },
  },

  finn_recruit: {
    id: 'finn_recruit',
    start: 'a',
    lines: {
      a: { speaker: '???', text: "Whoa, easy! I'm not a monster. Name's Finn. Treasure hunter. Mostly honest.", next: 'b' },
      b: {
        speaker: 'Finn',
        text: "Shadowfang Cave, huh? Word is there's a knight in black armor hiding in there with something very shiny.",
        next: 'c',
      },
      c: {
        speaker: 'Finn',
        text: "Tell you what. You do the swinging, I'll do the sneaking. I'll even let you keep the shiny thing. Deal?",
        choices: [
          { text: 'Deal.', next: 'join' },
          { text: 'No thanks.', next: 'refuse' },
        ],
      },
      refuse: { speaker: 'Finn', text: "Suit yourself. I'll be right here, admiring the trees. They're very nice trees." },
      join: { text: 'Finn joined the party!', action: { type: 'join', characterId: 'finn' }, next: 'after' },
      after: { speaker: 'Finn', text: "Great! The cave's up by the northeast cliffs, across the stream. Stay sharp." },
    },
  },

  merchant: {
    id: 'merchant',
    start: 'a',
    lines: {
      a: { speaker: 'Bram', text: "Welcome to Bram's Supplies! Potions, blades, the works. Have a look.", action: { type: 'shop', shopId: 'millbrook' } },
    },
  },

  innkeeper: {
    id: 'innkeeper',
    start: 'a',
    lines: {
      a: {
        speaker: 'Mae',
        text: "Welcome to the Sleeping Fox. You look worn out, dear. A bed's on the house for anyone chasing that thief.",
        choices: [
          { text: 'Rest for the night', next: 'rest' },
          { text: 'Not right now', next: 'decline' },
        ],
      },
      rest: { speaker: 'Mae', text: 'Sleep tight!', action: { type: 'heal' }, next: 'morning' },
      morning: { speaker: 'Mae', text: "Good morning! Everyone's rested and ready." },
      decline: { speaker: 'Mae', text: "Door's always open." },
    },
  },

  boy: {
    id: 'boy',
    start: 'a',
    lines: {
      a: {
        speaker: 'Tom',
        text: "The shadows came right up to the well last night. I wasn't scared, though. ...Much.",
      },
    },
  },

  boy_after: {
    id: 'boy_after',
    start: 'a',
    lines: {
      a: { speaker: 'Tom', text: "You actually did it! When I grow up I'm gonna be a hero too. Or a baker. Probably a hero." },
    },
  },

  woman: {
    id: 'woman',
    start: 'a',
    lines: {
      a: {
        speaker: 'Hazel',
        text: "Wolves in the forest are quick. If things get rough, Defend halves the damage you take until your next turn.",
      },
    },
  },

  oldman: {
    id: 'oldman',
    start: 'a',
    lines: {
      a: {
        speaker: 'Old Gus',
        text: "Heading out? Hold X or Shift to run. My knees haven't let me run in twenty years, so do it for me.",
      },
    },
  },

  kid: {
    id: 'kid',
    start: 'a',
    lines: {
      a: {
        speaker: 'Pip',
        text: "Did you know you can save anywhere outside of a fight? Just open the menu with Esc or C. My sister told me.",
      },
    },
  },

  dark_knight: {
    id: 'dark_knight',
    start: 'a',
    lines: {
      a: { speaker: 'Dark Knight', text: 'So Millbrook sends children to fetch its precious stone.', next: 'b' },
      b: { speaker: 'Dark Knight', text: 'This crystal belongs to my master now. Its light will feed the dark that is coming.', next: 'c' },
      c: {
        speaker: 'Dark Knight',
        text: 'Walk away, and I will let you crawl home. Stay... and I will bury you here.',
        choices: [
          { text: 'Give back the crystal!', next: 'fight' },
          { text: '(Back away slowly)', next: 'leave' },
        ],
      },
      leave: { speaker: 'Dark Knight', text: 'Wise. Run along.' },
      fight: { speaker: 'Dark Knight', text: 'Then die with it in sight.', action: BOSS_BATTLE },
    },
  },

  knight_defeated: {
    id: 'knight_defeated',
    start: 'a',
    lines: {
      a: { speaker: 'Dark Knight', text: 'Impossible... beaten by... villagers...', next: 'b' },
      b: { speaker: 'Dark Knight', text: 'The master... will come for it... himself...', next: 'c' },
      c: { text: 'The Dark Knight crumbles into drifting shadow.', next: 'd' },
      d: { text: 'Kael takes the Crystal of Light!', action: { type: 'giveItem', itemId: 'crystal_of_light' }, next: 'e' },
      e: { text: "Its warm light fills the cavern. Time to bring it home to Millbrook." },
    },
  },
};
