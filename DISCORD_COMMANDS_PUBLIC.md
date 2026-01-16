# Warden Discord Bot - Commands

**AI-powered Pathfinder 1E campaign assistant**

---

## 🎭 Character Commands

**`!setchar <character_name>`** - Link a character to this channel
**`!profile [@user]`** - View character sheet and stats
**`!connect <code>`** - Link Discord to your Warden account (get code from https://warden.my/settings)
**`!syncall`** - Sync all PathCompanion characters

**Character Proxying:** Type `CharName: message` to speak as your character with their avatar

---

## 🎲 Dice Rolling

**`!roll <dice> [+mod] [advantage/disadvantage]`**
- `!roll 1d20` - Simple roll
- `!roll 1d20 +5` - Roll with modifier
- `!roll 1d20 advantage` - Roll twice, take higher

**`!CharName <stat>`** - Roll using character's stat
- `!Gandalf strength` - Roll d20 + STR modifier
- `!Aragorn attack` - Roll d20 + attack bonus
- `!Gimli perception` - Roll d20 + perception

**Supported stats:** strength, dexterity, constitution, intelligence, wisdom, charisma, attack, ac, initiative, fortitude, reflex, will, and all skills

---

## 📊 Stats & Leaderboards

**`!stats [character]`** - View character activity
**`!leaderboard [posts/rolls/stars/characters]`** - Server leaderboards

---

## 🎨 RP Tools

**`!prompt`** - Get a random RP prompt
**`!prompt random <category>`** - Get prompt by category (character/world/combat/social/plot)
**`!trope`** - Get a random character trope

**`!hc <text>`** - Add a headcanon for your character
**`!hc list`** - View all your headcanons
**`!hc edit <#> <text>`** - Edit headcanon
**`!hc delete <#>`** - Delete headcanon

**`!hall list`** - View Hall of Fame (⭐ starred messages)

---

## 🤖 AI & World Building

**`!ask <question>`** - Ask Warden AI about your campaign (powered by Google Gemini 2.5 Flash)
**`!learn <key> <info>`** - Teach the AI campaign lore
**`!learnurl <url>`** - Import lore from a webpage

**`!lore add <title> <content>`** - Add lore entry
**`!lore list`** - View all lore
**`!lore view <#>`** - View specific entry
**`!lore tag <#> <tags>`** - Tag entry with keywords

**`!set <tags>`** - Set channel context for AI

---

## 🎲 Custom Content

**`!feat <description>`** - Generate custom Pathfinder 1E feat
**`!spell <description>`** - Generate custom spell

---

## 🧠 Character Features

**`!memory add <character> <content>`** - Add character memory
**`!memory view <character>`** - View all memories
**`!CharName memories`** - Quick memory view
**`!CharName update`** - Sync from PathCompanion

**`!CharName is OtherChar's <relationship> | <description>`** - Define character relationships
- Example: `!Gandalf is Frodo's mentor | Wise wizard guiding young hobbit`

---

## ⚙️ Admin Commands

**`!botset <key> <value>`** - Configure bot settings
- `rpchannel` - Set RP tracking channel
- `hallchannel` - Hall of Fame channel
- `leaderboardchannel` - Leaderboard channel
- `musicchannel` - Music announcements

**`!note <character> <content>`** - Create GM-only notes
**`!postleaderboard [channel]`** - Post formatted leaderboard
**`!weeklyreport`** - Generate weekly activity report
**`!monthlyreport`** - Generate monthly activity report
**`!music`** - Display current music/ambiance

---

## 💡 Quick Examples

```
!setchar Gandalf
Gandalf: I sense dark magic here...
!Gandalf perception
!roll 1d20 advantage
!prompt
!ask What do I know about this temple?
!feat A feat for improved dual-wielding
```

---

**Website:** https://warden.my
**Get Connection Code:** https://warden.my/settings
**Bot Version:** 2.0 (Unified)
