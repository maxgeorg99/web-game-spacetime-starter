import { DialogScript } from "../systems/DialogBox";

export type DialogTrigger =
  | "game_start"
  | "first_tower"
  | "first_wall"
  | "wave_incoming"
  | "wave_clear"
  | "enemy_near_shell"
  | "game_over"
  | "sandwich_found";

const LIFEGUARD = "Chad";

function sg(text: string) {
  return { text };
}

// ── Trigger map: each trigger maps to a DialogScript ──

export const DIALOGS: Record<DialogTrigger, DialogScript> = {
  game_start: {
    speaker: LIFEGUARD,
    pages: [
      sg("Hey there, beachgoer! Name's Chad. I'm the lifeguard around here. Best looking one too."),
      sg("See those shiny shells on the sand? That's the treasure, bro. Gotta protect 'em from the fish dudes."),
      sg("Use the toolbar at the bottom to build towers. Towers shoot at enemies automatically. Just click a sand tile!"),
      sg("Pro tip: towers only shoot to the left. So put 'em on the right side of the island."),
    ],
  },

  first_tower: {
    speaker: LIFEGUARD,
    pages: [
      sg("Nice tower! This baby will shoot anything that gets close. Well... anything to the left of it."),
      sg("You can click the tower to pick a weapon. I recommend the coconut. It's a classic."),
      sg("The bazooka is also great — it does zero damage but looks super intimidating. Fish hate that."),
    ],
  },

  first_wall: {
    speaker: LIFEGUARD,
    pages: [
      sg("A wall! Smart move. Enemies can't walk through walls. They'll just turn around and go home."),
      sg("Honestly, if you just build a full ring of walls around the shells, you win. The fish can't do anything about it."),
      sg("That's basically my whole strategy. Walls = win. Don't even need towers tbh."),
    ],
  },

  wave_incoming: {
    speaker: LIFEGUARD,
    pages: [
      sg("INCOMING! The fish dudes are on their way. My intel says they're coming from the NORTH."),
      sg("I'm like... pretty sure about that. My sources are solid. Totally solid."),
      sg("Check the warning sign on the left — it shows exactly what's coming. Those numbers are never wrong."),
    ],
  },

  wave_clear: {
    speaker: LIFEGUARD,
    pages: [
      sg("Dude, you survived! Nice. The shells are safe... for now."),
      sg("Between you and me, I think the fish are just getting warmed up. Next wave might be bigger."),
      sg("Maybe build some more walls? Walls solve everything. That's what they taught us at lifeguard school."),
    ],
  },

  enemy_near_shell: {
    speaker: LIFEGUARD,
    pages: [
      sg("UH OH. A fish is getting close to the shells! You should probably do something."),
      sg("Like... I don't know, click on it? Maybe there's a 'scare fish' button I forgot to mention?"),
      sg("Okay no there isn't. But don't panic! I'm sure it'll just... look at the shell and leave."),
    ],
  },

  game_over: {
    speaker: LIFEGUARD,
    pages: [
      sg("Well... that happened. The shells are gone. The fish won."),
      sg("I'm not gonna say I told you so, but I did tell you to build more walls."),
      sg("Look, don't beat yourself up. The fish were probably cheating anyway. You want a sandwich?"),
    ],
  },

  sandwich_found: {
    speaker: LIFEGUARD,
    pages: [
      sg("Whoa, you found a sandwich! That's mine actually. I was saving it."),
      sg("It's a ham and cheese. I think. Might be tuna. Hard to tell — it's been in my cooler since June."),
      sg("You know what, you can have it. I already ate. (He did not already eat.)"),
    ],
  },
};
