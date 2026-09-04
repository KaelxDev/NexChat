import { useMemo, useState } from "react";
import EmojiPicker from "./EmojiPicker";
import "./EmojiPickerExtra.css";

const EXTRA_CATEGORIES = [
  {
    id: "people-extra",
    label: "Mais pessoas",
    icon: "🧑",
    emojis: [
      ["🧑", "person pessoa"], ["👨", "man homem"], ["👩", "woman mulher"], ["🧒", "child criança"], ["👦", "boy menino"], ["👧", "girl menina"], ["👶", "baby bebe"], ["🧓", "older person idoso"],
      ["👴", "old man"], ["👵", "old woman"], ["🧔", "bearded person barba"], ["👮", "police officer"], ["🕵️", "detective"], ["👷", "construction worker"], ["💂", "guard"], ["🥷", "ninja"],
      ["👸", "princess"], ["🤴", "prince"], ["🧙", "mage wizard"], ["🧚", "fairy fada"], ["🧛", "vampire"], ["🧜", "merperson sereia"], ["🧝", "elf elfo"], ["🧞", "genie gênio"],
      ["🦸", "superhero heroi"], ["🦹", "supervillain vilao"], ["🫅", "person crown"], ["💇", "haircut"], ["💆", "massage"], ["🚶", "walking"], ["🏃", "running corrida"], ["💃", "dancing dança"],
    ],
  },
  {
    id: "travel-extra",
    label: "Viagem",
    icon: "✈️",
    emojis: [
      ["🚗", "car carro"], ["🚕", "taxi"], ["🚌", "bus onibus"], ["🚎", "trolleybus"], ["🏎️", "race car"], ["🚓", "police car"], ["🚑", "ambulance"], ["🚒", "fire truck"],
      ["🚚", "truck caminhão"], ["🚜", "tractor"], ["🏍️", "motorcycle"], ["🛵", "scooter"], ["🚲", "bicycle"], ["🛴", "scooter"], ["✈️", "airplane avião"], ["🛫", "departure"],
      ["🛬", "arrival"], ["🚁", "helicopter"], ["🚀", "rocket foguete"], ["🛸", "flying saucer ufo"], ["🚢", "ship navio"], ["⛵", "sailboat"], ["🚤", "speedboat"], ["🚂", "train"],
      ["🚆", "train"], ["🚇", "metro"], ["🚉", "station"], ["🚊", "tram"], ["🚝", "monorail"], ["🚞", "mountain railway"], ["🚋", "tram"], ["🗺️", "map mapa"],
    ],
  },
  {
    id: "nature-extra",
    label: "Natureza",
    icon: "🌎",
    emojis: [
      ["🌎", "earth americas"], ["🌍", "earth africa"], ["🌏", "earth asia"], ["🌕", "full moon lua cheia"], ["🌑", "new moon"], ["🌒", "crescent moon"], ["🌓", "first quarter moon"], ["🌔", "waxing moon"],
      ["🌖", "waning moon"], ["🌗", "last quarter moon"], ["🌘", "crescent moon"], ["🌙", "moon lua"], ["⭐", "star estrela"], ["🌟", "glowing star"], ["✨", "sparkles brilho"], ["💫", "dizzy star"],
      ["☄️", "comet cometa"], ["🌌", "milky way galaxy"], ["🌋", "volcano vulcão"], ["🏔️", "mountain"], ["⛰️", "mountain"], ["🏕️", "camping"], ["🏜️", "desert"], ["🏝️", "island"],
      ["🏞️", "national park"], ["🌊", "ocean mar"], ["🪨", "rock pedra"], ["🪵", "wood madeira"], ["🍄", "mushroom cogumelo"], ["🌰", "chestnut"], ["🪹", "nest"], ["🪺", "nest eggs"],
    ],
  },
  {
    id: "tech-extra",
    label: "Tecnologia",
    icon: "💻",
    emojis: [
      ["🖥️", "desktop computador"], ["💻", "laptop notebook"], ["⌨️", "keyboard teclado"], ["🖱️", "mouse"], ["🖨️", "printer impressora"], ["📱", "phone celular"], ["📲", "mobile phone"], ["☎️", "telephone"],
      ["📡", "satellite antenna"], ["🔋", "battery"], ["🔌", "plug tomada"], ["💾", "floppy disk"], ["💿", "cd"], ["📀", "dvd"], ["💽", "minidisc"], ["📼", "videocassette"],
      ["📷", "camera câmera"], ["📹", "video camera"], ["🎥", "movie camera"], ["📺", "television tv"], ["📻", "radio"], ["🎙️", "microphone"], ["🎧", "headphones fone"], ["🔊", "speaker volume"],
      ["🔇", "mute silencioso"], ["📶", "signal wifi"], ["🌐", "internet web"], ["🛰️", "satellite satélite"], ["🔭", "telescope"], ["🔬", "microscope"], ["🧪", "science laboratório"], ["⚙️", "settings gear"],
    ],
  },
  {
    id: "symbols-extra",
    label: "Símbolos",
    icon: "🔣",
    emojis: [
      ["❤️", "red heart coração"], ["🩷", "pink heart"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"], ["🩵", "light blue heart"], ["💙", "blue heart"], ["💜", "purple heart"],
      ["🤎", "brown heart"], ["🖤", "black heart"], ["🩶", "grey heart"], ["🤍", "white heart"], ["💔", "broken heart"], ["❤️‍🔥", "heart fire"], ["❤️‍🩹", "healing heart"], ["💗", "growing heart"],
      ["💖", "sparkling heart"], ["💘", "heart arrow"], ["💝", "heart ribbon"], ["💕", "two hearts"], ["💞", "revolving hearts"], ["💓", "beating heart"], ["💟", "heart decoration"], ["❣️", "heart exclamation"],
      ["☮️", "peace"], ["☯️", "yin yang"], ["☢️", "radioactive"], ["☣️", "biohazard"], ["⚠️", "warning"], ["🚫", "prohibited"], ["🔞", "no minors"], ["♻️", "recycle reciclagem"],
    ],
  },
];

export default function EmojiPickerExtra({ onSelect }) {
  const [extraOpen, setExtraOpen] = useState(false);
  const [activeExtra, setActiveExtra] = useState(EXTRA_CATEGORIES[0].id);
  const active = EXTRA_CATEGORIES.find((category) => category.id === activeExtra) || EXTRA_CATEGORIES[0];

  const extraEmojis = useMemo(() => active.emojis, [active]);

  return (
    <div className="emoji-picker-extra-shell">
      <EmojiPicker onSelect={onSelect} />
      <button
        type="button"
        className={`emoji-more-toggle${extraOpen ? " active" : ""}`}
        onClick={() => setExtraOpen((current) => !current)}
        aria-expanded={extraOpen}
      >
        <span>✨</span>
        <span>{extraOpen ? "Menos emojis" : "Mais emojis"}</span>
        <span className="emoji-more-chevron">{extraOpen ? "⌃" : "⌄"}</span>
      </button>
      {extraOpen && (
        <div className="emoji-extra-panel">
          <div className="emoji-extra-tabs">
            {EXTRA_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={activeExtra === category.id ? "active" : ""}
                onClick={() => setActiveExtra(category.id)}
                title={category.label}
                aria-label={category.label}
              >
                {category.icon}
              </button>
            ))}
          </div>
          <div className="emoji-extra-title">{active.label}</div>
          <div className="emoji-extra-grid">
            {extraEmojis.map(([emoji, keywords], index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                className="emoji-extra-cell"
                onClick={() => onSelect(emoji)}
                title={keywords}
                aria-label={keywords}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
