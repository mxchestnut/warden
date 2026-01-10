import{j as e}from"./index-BcQW7OjF.js";import{c as i,M as r,f as d,g as n,B as o,H as l}from"./Dashboard-CwAWU9Zg.js";import{U as c}from"./users-BQ9DKwfh.js";import{S as m}from"./sparkles-Bm9JvvY6.js";import{C as t}from"./clock-kITb3aED.js";(function(){try{var s=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{};s.SENTRY_RELEASE={id:"9100b80d8d3578ae8a7e4dcad47fa28b1cb8d4d7"}}catch{}})();try{(function(){var s=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{},a=new s.Error().stack;a&&(s._sentryDebugIds=s._sentryDebugIds||{},s._sentryDebugIds[a]="c0e7dd22-5db9-4a45-ad7b-2178d2ac53b2",s._sentryDebugIdIdentifier="sentry-dbid-c0e7dd22-5db9-4a45-ad7b-2178d2ac53b2")})()}catch{}/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=i("Star",[["polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",key:"8f66p6"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=i("StickyNote",[["path",{d:"M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z",key:"1wis1t"}],["path",{d:"M15 3v6h6",key:"edgan2"}]]);function u(){return e.jsxs("div",{className:"discord-commands-container",children:[e.jsxs("div",{className:"commands-header",children:[e.jsx(r,{size:32}),e.jsxs("div",{children:[e.jsx("h1",{children:"Discord Bot Commands"}),e.jsx("p",{children:"Use these commands with Warden bot in your Discord server - 32+ commands available!"})]})]}),e.jsxs("div",{className:"commands-sections",children:[e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(d,{size:24}),e.jsx("h2",{children:"Channel Linking"})]}),e.jsx("p",{className:"section-description",children:"Link Discord channels to characters so portal rolls automatically post there"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!setchar <character_name>"})}),e.jsx("div",{className:"command-description",children:"Link this channel to a character. Portal rolls will post here automatically."}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"!setchar Ogun"}),e.jsx("code",{children:"!setchar Max Eisenhardt"})]})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!char"})}),e.jsx("div",{className:"command-description",children:"Show which character is currently linked to this channel"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(n,{size:24}),e.jsx("h2",{children:"Rolling Dice"})]}),e.jsx("p",{className:"section-description",children:"Roll checks for your characters directly from Discord"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!roll <stat/save/skill>"})}),e.jsx("div",{className:"command-description",children:"Roll a check for the character linked to this channel"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Ability Scores:"}),e.jsx("code",{children:"!roll strength"}),e.jsx("code",{children:"!roll dexterity"}),e.jsx("code",{children:"!roll constitution"}),e.jsx("code",{children:"!roll intelligence"}),e.jsx("code",{children:"!roll wisdom"}),e.jsx("code",{children:"!roll charisma"})]}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Saving Throws:"}),e.jsx("code",{children:"!roll fortitude"}),e.jsx("code",{children:"!roll reflex"}),e.jsx("code",{children:"!roll will"})]}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Skills:"}),e.jsx("code",{children:"!roll perception"}),e.jsx("code",{children:"!roll stealth"}),e.jsx("code",{children:"!roll diplomacy"})]})]}),e.jsxs("div",{className:"command-card highlight",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!<CharacterName> <stat/save/skill>"})}),e.jsx("div",{className:"command-description",children:"Roll with any character by name, from any channel (no linking needed!)"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"!Ogun strength"}),e.jsx("code",{children:"!Elystrix perception"}),e.jsx("code",{children:"!Max fortitude"})]})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(c,{size:24}),e.jsx("h2",{children:"Character Proxying"})]}),e.jsx("p",{className:"section-description",children:"Speak as your character with their name and avatar (like Tupperbox)"}),e.jsxs("div",{className:"command-card highlight",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"<CharacterName>: <message>"})}),e.jsx("div",{className:"command-description",children:"Post a message as your character. Your message will be deleted and reposted with the character's name and avatar."}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"Ogun: Time to crush some skulls!"}),e.jsx("code",{children:"Elystrix: I sense danger ahead..."}),e.jsx("code",{children:"Max: The future of mutantkind is at stake."})]}),e.jsx("div",{className:"command-note",children:"💡 Tip: Add an avatar URL to your character in the portal for custom avatars!"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(m,{size:24}),e.jsx("h2",{children:"RP Prompts & Inspiration"})]}),e.jsx("p",{className:"section-description",children:"Get creative prompts and trope inspiration for your roleplay"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!prompt [category]"})}),e.jsx("div",{className:"command-description",children:"Get a random RP prompt. Categories: character, world, combat, social, plot"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"!prompt"}),e.jsx("code",{children:"!prompt character"}),e.jsx("code",{children:"!prompt combat"})]})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!trope [category]"})}),e.jsx("div",{className:"command-description",children:"Get random trope inspiration. Categories: character, plot, relationship, world"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"!trope"}),e.jsx("code",{children:"!trope character"})]})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(o,{size:24}),e.jsx("h2",{children:"Session & Scene Tracking"})]}),e.jsx("p",{className:"section-description",children:"Track sessions and scenes with automatic message logging"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!session start <title>"})}),e.jsx("div",{className:"command-description",children:"Start tracking a session. All messages will be logged until you end it."}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"More Session Commands:"}),e.jsx("code",{children:"!session end"}),e.jsx("code",{children:"!session pause"}),e.jsx("code",{children:"!session resume"}),e.jsx("code",{children:"!session list"})]})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!scene start <title>"})}),e.jsx("div",{className:"command-description",children:"Start a new scene with automatic message logging"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"More Scene Commands:"}),e.jsx("code",{children:"!scene end"}),e.jsx("code",{children:"!scene tag <tags>"}),e.jsx("code",{children:"!scene location <place>"}),e.jsx("code",{children:"!scene list"})]})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!recap"})}),e.jsx("div",{className:"command-description",children:"Get a quick summary of the current session"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(h,{size:24}),e.jsx("h2",{children:"Hall of Fame (Starboard)"})]}),e.jsx("p",{className:"section-description",children:"React with ⭐ to epic messages! Messages with 10+ stars get immortalized"}),e.jsxs("div",{className:"command-card highlight",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"React with ⭐"})}),e.jsx("div",{className:"command-description",children:"React to any message with a star emoji. When a message gets 10+ stars, it's automatically posted to #hall-of-fame!"}),e.jsx("div",{className:"command-note",children:"💡 Hall of Fame messages include context (previous message) and are removed if stars drop below 10"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!hall"})}),e.jsx("div",{className:"command-description",children:"View recent Hall of Fame entries"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!hall top"})}),e.jsx("div",{className:"command-description",children:"View top 20 most-starred messages of all time"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(c,{size:24}),e.jsx("h2",{children:"Relationship Tracking"})]}),e.jsx("p",{className:"section-description",children:"Track character relationships that display in profiles"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!<Char1> is <Char2>'s <descriptor> | <notes>"})}),e.jsx("div",{className:"command-description",children:"Create or update a character relationship"}),e.jsxs("div",{className:"command-examples",children:[e.jsx("div",{className:"example-label",children:"Examples:"}),e.jsx("code",{children:"!Aria is Kael's best friend | They met during the war"}),e.jsx("code",{children:"!Marcus is Elena's mentor | Teaching her ancient magic"})]}),e.jsx("div",{className:"command-note",children:"💡 View relationships in !profile <character> → Relationships tab"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(t,{size:24}),e.jsx("h2",{children:"Utility Commands"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!time [set <date>]"})}),e.jsx("div",{className:"command-description",children:"View or set in-game time/date"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!note add <text>"})}),e.jsx("div",{className:"command-description",children:"Add a GM note. Use !note list to view your notes"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!npc <name>"})}),e.jsx("div",{className:"command-description",children:"Generate quick NPC stat block (AI-powered)"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!music"})}),e.jsx("div",{className:"command-description",children:"Get mood music suggestions for the current scene"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(x,{size:24}),e.jsx("h2",{children:"Admin Commands"})]}),e.jsx("p",{className:"section-description",children:"Requires Discord Administrator permission"}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!learn <question> | <answer>"})}),e.jsx("div",{className:"command-description",children:"Add knowledge base entry for !ask command"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!botset"})}),e.jsx("div",{className:"command-description",children:"Set the bot announcement channel for scheduled prompts and events"})]})]}),e.jsxs("section",{className:"command-section",children:[e.jsxs("div",{className:"section-header",children:[e.jsx(l,{size:24}),e.jsx("h2",{children:"Getting Help"})]}),e.jsxs("div",{className:"command-card",children:[e.jsx("div",{className:"command-syntax",children:e.jsx("code",{children:"!help"})}),e.jsx("div",{className:"command-description",children:"Display a complete command reference in Discord"})]})]})]}),e.jsxs("div",{className:"setup-section",children:[e.jsx("h2",{children:"Setup Instructions"}),e.jsxs("ol",{children:[e.jsx("li",{children:"Make sure Warden bot is in your Discord server"}),e.jsxs("li",{children:["Create a ",e.jsx("code",{children:"#hall-of-fame"})," channel for starred messages"]}),e.jsx("li",{children:"Create or import your characters in the Character Sheets tab"}),e.jsx("li",{children:"Optionally add avatar URLs to your characters for custom proxying"}),e.jsxs("li",{children:["Use ",e.jsx("code",{children:"!setchar <name>"})," in any channel to link it for auto-rolls"]}),e.jsxs("li",{children:["Use ",e.jsx("code",{children:"!botset"})," (admin) to set announcement channel for daily prompts"]}),e.jsx("li",{children:"Start rolling, tracking sessions, and roleplaying!"})]}),e.jsxs("div",{className:"feature-highlight",children:[e.jsx("h3",{children:"New Features!"}),e.jsxs("ul",{children:[e.jsxs("li",{children:[e.jsx("strong",{children:"Daily Prompts:"})," Get creative inspiration with !prompt and !trope"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Hall of Fame:"})," Star epic moments (⭐ × 10) to immortalize them"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Session Tracking:"})," Automatic message logging for sessions and scenes"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"Relationships:"})," Track character connections in profiles"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"AI Tools:"})," NPC generator, music suggestions, and more!"]})]})]})]}),e.jsx("style",{children:`
        .discord-commands-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .commands-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--border-color);
        }

        .commands-header svg {
          color: var(--primary-color);
        }

        .commands-header h1 {
          margin: 0;
          font-size: 2rem;
        }

        .commands-header p {
          margin: 0.25rem 0 0 0;
          color: var(--text-secondary);
        }

        .commands-sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .command-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .section-header svg {
          color: var(--accent-color);
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .section-description {
          color: var(--text-secondary);
          margin: 0 0 1.5rem 0;
        }

        .command-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }

        .command-card.highlight {
          border-color: var(--accent-color);
          background: var(--accent-light);
        }

        .command-syntax {
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--accent-color);
        }

        .command-syntax code {
          background: var(--accent-light);
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          border-left: 3px solid var(--accent-color);
          color: var(--text-primary);
        }

        .command-description {
          color: var(--text-primary);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .command-examples {
          margin-top: 1rem;
        }

        .example-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .command-examples code {
          display: block;
          background: var(--bg-tertiary);
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          color: var(--accent-color);
        }

        .command-note {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--accent-light);
          border-left: 3px solid var(--accent-color);
          border-radius: 4px;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .setup-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
        }

        .setup-section h2 {
          margin-top: 0;
          margin-bottom: 1rem;
        }

        .setup-section ol {
          margin: 0;
          padding-left: 1.5rem;
        }

        .setup-section li {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }

        .setup-section code {
          background: var(--accent-light);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .feature-highlight {
          margin-top: 2rem;
          padding: 1.5rem;
          background: var(--accent-light);
          border-left: 4px solid var(--accent-color);
          border-radius: 4px;
        }

        .feature-highlight h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: var(--accent-color);
        }

        .feature-highlight ul {
          margin: 0;
          padding-left: 1.5rem;
        }

        .feature-highlight li {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }

        .feature-highlight strong {
          color: var(--accent-color);
        }
      `})]})}export{u as default};
//# sourceMappingURL=DiscordCommands-Co4uvjOb.js.map
