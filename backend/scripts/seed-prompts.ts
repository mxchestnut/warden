import { db } from '../src/db/index.js';
import { prompts, tropes } from '../src/db/schema.js';

async function seedPrompts() {
  console.log('🌱 Seeding prompts and tropes...');

  // Character prompts
  const characterPrompts = [
    "Describe a childhood memory that shaped your character's worldview.",
    "What does your character do when no one is watching?",
    "Your character receives a letter from their past. What does it say?",
    "Describe your character's morning routine.",
    "What secret does your character keep from the party?",
    "Your character meets their younger self. What do they say?",
    "Describe a moment when your character felt truly afraid.",
    "What does your character value more: loyalty or truth?",
  ];

  const worldPrompts = [
    "Describe the local tavern and its most interesting patron.",
    "What legend do children in this region tell around campfires?",
    "Describe the smell and sounds of the marketplace at dawn.",
    "What ancient ruins lie hidden in the nearby wilderness?",
    "Describe a local festival and what it celebrates.",
    "What dark secret does this town's mayor hide?",
  ];

  const combatPrompts = [
    "Describe how your character reacts when ambushed.",
    "Your character's weapon breaks mid-combat. What do they do?",
    "Describe your character's fighting stance and style.",
    "Your ally falls in battle. How does your character respond?",
    "Describe the moment before your character strikes the killing blow.",
  ];

  const socialPrompts = [
    "Your character must convince a guard to let them pass. How?",
    "Describe how your character flirts (or fails to).",
    "Your character insults a noble at a party. What happens?",
    "Describe your character's reaction to being lied to.",
    "How does your character comfort a grieving stranger?",
  ];

  const plotPrompts = [
    "A mysterious hooded figure has been following the party. Who are they?",
    "An old enemy offers to help with the current quest. Why?",
    "The party discovers their quest was based on a lie. What was it?",
    "A prophecy mentions one of the party members by name. What does it say?",
    "The villain offers to spare the party if they betray one member. What happens?",
  ];

  // Insert prompts
  const promptData = [
    ...characterPrompts.map(text => ({ category: 'character', promptText: text })),
    ...worldPrompts.map(text => ({ category: 'world', promptText: text })),
    ...combatPrompts.map(text => ({ category: 'combat', promptText: text })),
    ...socialPrompts.map(text => ({ category: 'social', promptText: text })),
    ...plotPrompts.map(text => ({ category: 'plot', promptText: text })),
  ];

  await db.insert(prompts).values(promptData);
  console.log(`✅ Inserted ${promptData.length} prompts`);

  // Tropes
  const tropeData = [
    {
      name: "The Reluctant Hero",
      description: "Thrust into adventure against their will, but rises to the occasion when it matters most.",
      category: "archetype"
    },
    {
      name: "The Mentor with a Dark Past",
      description: "Wise and experienced, but haunted by mistakes that shaped who they became.",
      category: "archetype"
    },
    {
      name: "The Comic Relief with Hidden Depths",
      description: "Jokes and makes light of danger, but reveals profound wisdom in critical moments.",
      category: "archetype"
    },
    {
      name: "The Stoic Warrior",
      description: "Few words, strong convictions. Actions speak louder than speeches.",
      category: "archetype"
    },
    {
      name: "From Enemies to Allies",
      description: "Two characters who started as rivals slowly develop mutual respect and friendship.",
      category: "dynamic"
    },
    {
      name: "The Chosen One Who Doesn't Want It",
      description: "Prophecy marks them as special, but they'd rather live a normal life.",
      category: "archetype"
    },
    {
      name: "The Betrayal",
      description: "A trusted ally reveals they've been working against the party all along.",
      category: "plot"
    },
    {
      name: "The Impossible Choice",
      description: "Must choose between two equally important things - both cannot be saved.",
      category: "situation"
    },
    {
      name: "Dark Secret Revealed",
      description: "A character's hidden past comes to light at the worst possible moment.",
      category: "plot"
    },
    {
      name: "The Sacrifice Play",
      description: "A character chooses to give something precious to save others.",
      category: "situation"
    },
  ];

  await db.insert(tropes).values(tropeData);
  console.log(`✅ Inserted ${tropeData.length} tropes`);

  console.log('🎉 Seeding complete!');
  process.exit(0);
}

seedPrompts().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
