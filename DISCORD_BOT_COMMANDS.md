# Warden Discord Bot - Command Reference

**Last Updated:** January 14, 2026  
**Bot Name:** Warden  
**Purpose:** Pathfinder 1E campaign assistant with character management, dice rolling, and AI features

---

## 🎭 Character Commands (FREE)

### `!setchar <character_name>`
**Description:** Link a character to the current Discord channel  
**Example:** `!setchar Aragorn`  
**Notes:** Character must exist in your Warden account first. Displays confirmation message.

### `!profile [@user]`
**Description:** View a user's profile and extensive character sheet  
**Example:** `!profile` or `!profile @Username`  
**Notes:** Shows all characters, stats, HP, AC, saves, skills, and more

### `!connect <code>`
**Description:** Link your Discord account to your Warden account  
**Example:** `!connect ABC123XYZ`  
**Notes:** Get your unique connection code from https://warden.my/settings (one-time use, expires in 15 minutes)

### `!syncall`
**Description:** Sync all your PathCompanion characters to Warden  
**Notes:** Requires PathCompanion connection in Warden settings

### Character Proxying (No Command)
**Description:** Speak as your active character  
**Syntax:** `CharName: message` or `!CharName: message`  
**Example:** `Gandalf: I am a wizard!`  
**Notes:** Bot will repost as a webhook with character's name and avatar

---

## 🎲 Dice Rolling (FREE)

### `!roll <dice> [+modifier] [advantage/disadvantage]`
**Description:** Roll dice with modifiers  
**Examples:**
- `!roll 1d20` - Simple d20 roll
- `!roll 1d20 +5` - d20 with +5 modifier
- `!roll 2d6 +3` - Roll 2d6 and add 3
- `!roll 1d20 advantage` - Roll twice, take higher
- `!roll 1d20 disadvantage` - Roll twice, take lower

### `!CharName <stat>`
**Description:** Roll using character's stat bonus  
**Examples:**
- `!Gandalf strength` - Roll d20 + Gandalf's strength modifier
- `!Aragorn attack` - Roll d20 + Aragorn's attack bonus
- `!Gimli perception` - Roll d20 + Gimli's perception bonus

**Supported Stats:**
- Ability scores: `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`
- Combat: `attack`, `ac`, `initiative`, `cmb`, `cmd`
- Saves: `fortitude`, `reflex`, `will`
- Skills: `acrobatics`, `appraise`, `bluff`, `climb`, `diplomacy`, `perception`, etc.

---

## 📊 Stats & Leaderboards (FREE)

### `!stats [character_name]`
**Description:** View character statistics and activity  
**Example:** `!stats Gandalf`  
**Notes:** Shows total messages, dice rolls, and activity metrics

### `!leaderboard [type]`
**Description:** View server leaderboards  
**Types:**
- `posts` - Most active posters (default)
- `rolls` - Most dice rolls
- `stars` - Most ⭐ reactions received
- `characters` - Most characters created

**Examples:**
- `!leaderboard` - Top posters
- `!leaderboard rolls` - Top rollers
- `!leaderboard stars` - Most starred messages

### `!postleaderboard [channel]`
**Description:** Post a formatted leaderboard in the channel  
**Example:** `!postleaderboard #general`  
**Notes:** Admin only - creates an embed with all leaderboards

---

## ⚙️ Admin Commands

### `!botset <key> <value>`
**Description:** Configure bot settings for the server  
**Keys:**
- `rpchannel` - Set RP activity tracking channel
- `hallchannel` - Set Hall of Fame display channel
- `leaderboardchannel` - Set leaderboard post channel
- `musicchannel` - Set music announcement channel

**Example:** `!botset rpchannel #roleplay`  
**Notes:** Admin only

---

## ⭐ RP Tier Commands (PREMIUM)

**🔒 Requires RP tier subscription** - Subscribe at https://warden.my/settings

### � GM Tools

#### `!note <character> <content>`
**Description:** Create GM notes for characters/NPCs  
**Example:** `!note Villain Secretly working for the king`  
**Notes:** Admin only. Viewable only by GMs

#### `!music`
**Description:** Display currently playing music/ambiance  
**Notes:** Integrated with bot settings

#### `!hall [add/remove/list/clear]`
**Description:** Manage Hall of Fame (starred messages)  
**Examples:**
- `!hall list` - View all Hall of Fame entries
- `!hall clear` - Remove all entries (Admin only)

**Notes:** Messages with 3+ ⭐ reactions auto-added to Hall of Fame

#### `!hc [add/remove/list] [character]`
**Description:** Manage hardcore (permadeath) character list  
**Examples:**
- `!hc add Gandalf` - Add character to hardcore list
- `!hc remove Gandalf` - Remove from hardcore list
- `!hc list` - View all hardcore characters

**Notes:** Adds ⚠️ warnings when hardcore characters roll

#### `!weeklyreport`
**Description:** Generate weekly activity report  
**Shows:** Top posters, rollers, and activity stats for past 7 days  
**Notes:** Admin recommended

#### `!monthlyreport`
**Description:** Generate monthly activity report  
**Shows:** Top posters, rollers, and activity stats for past 30 days  
**Notes:** Admin recommended

---

### �🎨 RP Prompts & Tropes

#### `!prompt [view/add/remove/list] [content]`
**Description:** Manage RP prompts for daily inspiration  
**Examples:**
- `!prompt list` - View all your prompts
- `!prompt add Describe your character's morning routine`
- `!prompt remove 3` - Remove prompt #3
- `!prompt view 5` - View prompt #5

**Notes:** Bot can send random daily prompts to your channel

#### `!trope [view/add/remove/list] [content]`
**Description:** Manage character tropes and personality traits  
**Examples:**
- `!trope list` - View all your tropes
- `!trope add The reluctant hero who doubts themselves`
- `!trope remove 2` - Remove trope #2

**Notes:** Use for character development inspiration

#### `!promptsettings [key] [value]`
**Description:** Configure prompt delivery settings  
**Keys:**
- `channel` - Set channel for daily prompts
- `time` - Set delivery time (UTC)
- `enabled` - Enable/disable daily prompts

**Example:** `!promptsettings channel #roleplay`

---

### 🤖 AI & Knowledge Base

#### `!ask <question>`
**Description:** Ask Warden AI about your campaign/world  
**Example:** `!ask What is the history of the Shadow Kingdom?`  
**Notes:** AI learns from your lore and notes. Uses Google Gemini 2.5 Flash

#### `!learn <key> <information>`
**Description:** Teach Warden AI facts about your campaign  
**Example:** `!learn Shadow Kingdom A dark realm ruled by necromancers`  
**Notes:** Knowledge persists and is searchable with `!ask`

#### `!learnurl <url>`
**Description:** Teach Warden AI by scraping a webpage  
**Example:** `!learnurl https://example.com/campaign-wiki`  
**Notes:** Bot will extract text and add to knowledge base

---

### 🎲 D&D AI Generation

#### `!feat <description>`
**Description:** Generate a custom Pathfinder 1E feat  
**Example:** `!feat A feat that improves dual-wielding daggers`  
**Notes:** AI creates balanced feat with prerequisites and benefits

#### `!spell <description>`
**Description:** Generate a custom Pathfinder 1E spell  
**Example:** `!spell A 3rd level spell that summons spectral wolves`  
**Notes:** AI creates spell with level, school, components, and effects

---

### 🧠 Character Memories

#### `!memory [add/view/clear] <character> [content]`
**Description:** Manage AI-enhanced character memories  
**Examples:**
- `!memory add Gandalf Met a mysterious hooded figure in Bree`
- `!memory view Gandalf` - View all memories for Gandalf
- `!memory clear Gandalf` - Clear all memories (careful!)

**Notes:** Memories are AI-searchable and can influence character development

#### `!CharName memories`
**Description:** Quick view of character memories  
**Example:** `!Gandalf memories`  
**Notes:** Displays all memories for that character

#### `!CharName update`
**Description:** Update character from PathCompanion  
**Example:** `!Gandalf update`  
**Notes:** Syncs latest stats from PathCompanion

---

### 🌍 World Building Lore

#### `!lore [add/view/remove/list/tag] [content]`
**Description:** Manage campaign world lore entries  
**Examples:**
- `!lore add The Great War A 100-year conflict between kingdoms`
- `!lore list` - View all lore entries
- `!lore view 5` - View lore entry #5
- `!lore tag 5 history war` - Tag entry #5 with keywords
- `!lore remove 5` - Delete lore entry #5

**Notes:** Lore is AI-searchable and helps build campaign consistency

#### `!set [lore tags]`
**Description:** Set lore context for the current channel  
**Example:** `!set tavern city market`  
**Notes:** Helps `!ask` provide context-aware responses

---

### 💞 Character Relationships

#### `!CharName is OtherChar's <relationship> | <description>`
**Description:** Define relationships between characters  
**Examples:**
- `!Gandalf is Frodo's mentor | Wise wizard guiding young hobbit`
- `!Aragorn is Legolas's friend | Battle companions from the war`

**Notes:** RP tier only. Builds character relationship web

---

## 🆘 Help & Info

### `!help`
**Description:** Display help message with command list  
**Notes:** Shows tiered access and premium features

---

## 🎯 Quick Reference

### Free Tier Commands (Everyone)
- `!setchar`, `!profile`, `!connect`, `!syncall`
- `!roll`, `!CharName stat`
- `!stats`, `!leaderboard`, `!postleaderboard`
- Character proxying: `CharName: message`

### Admin Commands
- `!botset` - Configure bot channels and settings

### RP Tier Commands (Premium Only) 🔒
- `!note`, `!music`, `!hall`, `!hc` - GM tools
- `!weeklyreport`, `!monthlyreport` - Activity reports
- `!prompt`, `!trope`, `!promptsettings`
- `!ask`, `!learn`, `!learnurl`
- `!feat`, `!spell`
- `!memory`, `!CharName memories`
- `!lore`, `!set`
- `!CharName is OtherChar's relationship`
- `!CharName update`

---

## 🎮 Usage Examples

### Typical Session Flow
```
# Player sets active character
Player: !setchar Gandalf

# Player speaks as character
Player: Gandalf: I sense dark magic in this place...
Bot: [Webhook as Gandalf with avatar]

# Player rolls perception
Player: !Gandalf perception
Bot: 🎲 Gandalf rolls Perception: 1d20 (15) +8 = 23

# RP tier user asks AI
Player: !ask What do I know about this temple?
Bot: Based on your campaign lore, the Temple of Shadows was built...

# Player rolls advantage
Player: !roll 1d20 advantage
Bot: 🎲 Rolled 1d20 (advantage): [12, 18] = 18
```

### GM Setup
```
# Set up bot channels (Admin)
!botset rpchannel #roleplay
!botset hallchannel #hall-of-fame
!botset leaderboardchannel #stats

# Mark hardcore campaign (RP tier)
!hc add Gandalf
!hc add Aragorn
```

---

## 📝 Notes

- **Character Names:** Case-insensitive, supports accents and special characters
- **Permissions:** Admin-only commands require Discord Administrator permission
- **Discord Connection:** Get your connection code from https://warden.my/settings - never share passwords on Discord!
- **PathCompanion:** Sync works with PathCompanion.com character sheets
- **AI Features:** Powered by Google Gemini 2.5 Flash
- **Subscriptions:** Manage at https://warden.my/settings

---

## 🆙 Upgrade to RP Tier

**Get access to ALL premium features:**
- ✨ AI knowledge base and world building
- 🎲 Custom feat and spell generation
- 🧠 Character memory system
- 🎨 RP prompts and tropes
- 💞 Character relationships
- 📅 Daily prompt scheduling

**Subscribe at:** https://warden.my/settings

---

## 🐛 Issues or Questions?

- **Website:** https://warden.my
- **Support:** Check the website for contact info
- **Bot Version:** 2.0 (Unified)
