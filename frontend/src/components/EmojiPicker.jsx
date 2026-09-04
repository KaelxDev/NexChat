import { useMemo, useState } from "react";
import "./EmojiPicker.css";

const CATEGORIES = [
  {
    id: "people",
    label: "Pessoas",
    icon: "☻",
    emojis: [
      ["😀", "grinning"], ["😃", "smile"], ["😄", "smiling"], ["😁", "beaming"], ["😆", "laughing"], ["😅", "sweat smile"], ["😂", "joy laughing"], ["🤣", "rofl"],
      ["🥲", "smiling tear"], ["😊", "blush"], ["😇", "innocent"], ["🙂", "slightly smile"], ["🙃", "upside down"], ["😉", "wink"], ["😌", "relieved"], ["😍", "heart eyes"],
      ["🥰", "love hearts"], ["😘", "kiss"], ["😗", "kissing"], ["😚", "kissing closed eyes"], ["😙", "kissing smiling"], ["🥹", "tears"], ["😋", "yum"], ["😛", "tongue"],
      ["😝", "stuck out tongue"], ["😜", "wink tongue"], ["🤪", "zany"], ["🤨", "raised eyebrow"], ["🧐", "monocle"], ["🤓", "nerd"], ["😎", "sunglasses"], ["🤩", "star eyes"],
      ["🥳", "party"], ["😏", "smirk"], ["😒", "unamused"], ["😞", "disappointed"], ["😔", "pensive"], ["😟", "worried"], ["😕", "confused"], ["🙁", "slightly frown"],
      ["☹️", "frown"], ["😣", "persevere"], ["😖", "confounded"], ["😫", "tired"], ["😩", "weary"], ["🥺", "pleading"], ["😢", "cry"], ["😭", "sob"],
      ["😤", "triumph"], ["😠", "angry"], ["😡", "rage"], ["🤬", "cursing"], ["🤯", "exploding head"], ["😳", "flushed"], ["🥵", "hot"], ["🥶", "cold"],
      ["😱", "scream"], ["😨", "fearful"], ["😰", "anxious"], ["😥", "sad relief"], ["😓", "sweat"], ["🤗", "hug"], ["🤔", "thinking"], ["🫡", "salute"],
      ["🤭", "hand over mouth"], ["🫢", "shy"], ["🫣", "peek"], ["🤫", "shushing"], ["🤥", "lying"], ["😶", "no mouth"], ["🫠", "melting"], ["😐", "neutral"],
      ["😑", "expressionless"], ["😬", "grimace"], ["🙄", "rolling eyes"], ["😯", "hushed"], ["😦", "frowning open mouth"], ["😧", "anguish"], ["😮", "open mouth"], ["😲", "astonished"],
      ["🥱", "yawn"], ["😴", "sleeping"], ["🤤", "drooling"], ["😪", "sleepy"], ["😵", "dizzy"], ["🤐", "zipper mouth"], ["🤢", "nauseated"], ["🤮", "vomit"],
      ["🤧", "sneezing"], ["😷", "mask"], ["🤒", "sick"], ["🤕", "injured"], ["🤠", "cowboy"], ["😈", "smiling devil"], ["👿", "angry devil"], ["👹", "ogre"],
      ["👺", "goblin"], ["🤡", "clown"], ["💩", "poop"], ["👻", "ghost"], ["💀", "skull"], ["☠️", "skull crossbones"], ["👽", "alien"], ["🤖", "robot"],
      ["😺", "grinning cat"], ["😸", "grinning cat smile"], ["😹", "cat joy"], ["😻", "cat heart eyes"], ["😼", "cat smirk"], ["😽", "cat kiss"], ["🙀", "cat scream"], ["😿", "cat cry"],
      ["😾", "cat angry"], ["🫨", "shaking face"], ["🫤", "dotted line face"], ["🫥", "dotted face"], ["🫡", "saluting face"], ["🫶", "heart hands"], ["🤑", "money mouth"], ["🤠", "cowboy hat"],
      ["🤦", "facepalm"], ["🤷", "shrug"], ["🙅", "no gesture"], ["🙆", "ok gesture"], ["💁", "information desk"], ["🙋", "raising hand"], ["🙇", "bow"], ["🤦‍♂️", "man facepalm"],
    ],
  },
  {
    id: "gestures",
    label: "Gestos",
    icon: "✋",
    emojis: [
      ["👍", "thumbs up"], ["👎", "thumbs down"], ["👌", "ok"], ["✌️", "peace"], ["🤞", "fingers crossed"], ["🤟", "love"], ["🤘", "rock"], ["🤙", "call"],
      ["👋", "wave"], ["👏", "clap"], ["🙌", "raised hands"], ["👐", "open hands"], ["🤝", "handshake"], ["🙏", "pray"], ["💪", "muscle"], ["🫶", "heart hands"],
      ["☝️", "point up"], ["👇", "point down"], ["👆", "point up"], ["👉", "point right"], ["👈", "point left"], ["✍️", "writing"], ["💅", "nail polish"], ["🤳", "selfie"],
      ["🤏", "pinch"], ["🤌", "pinched fingers"], ["🖖", "vulcan"], ["👊", "fist punch"], ["✊", "raised fist"], ["🤛", "left fist"], ["🤜", "right fist"], ["🤚", "raised back hand"],
      ["🖐️", "five fingers"], ["🖖", "vulcan salute"], ["👋", "hello goodbye"], ["🫰", "finger heart"], ["🫵", "point at viewer"], ["🫳", "palm down"], ["🫴", "palm up"], ["🫱", "right hand"],
      ["🫲", "left hand"], ["🫸", "rightwards hand"], ["🫷", "leftwards hand"], ["🤲", "palms up"], ["🤜", "right punch"], ["🤛", "left punch"], ["👏", "applause"], ["🙌", "celebrate"],
      ["👐", "hug open hands"], ["💪", "strong"], ["🦾", "mechanical arm"], ["🦿", "mechanical leg"], ["👀", "eyes"], ["👁️", "eye"], ["👄", "mouth"], ["👅", "tongue"],
    ],
  },
  {
    id: "animals",
    label: "Animais",
    icon: "🐾",
    emojis: [
      ["🐶", "dog cachorro"], ["🐱", "cat gato"], ["🐭", "mouse"], ["🐹", "hamster"], ["🐰", "rabbit coelho"], ["🦊", "fox"], ["🐻", "bear urso"], ["🐼", "panda"],
      ["🐨", "koala"], ["🐯", "tiger"], ["🦁", "lion"], ["🐮", "cow"], ["🐷", "pig"], ["🐸", "frog sapo"], ["🐵", "monkey"], ["🙈", "see no evil"],
      ["🙉", "hear no evil"], ["🙊", "speak no evil"], ["🐔", "chicken"], ["🐧", "penguin"], ["🐦", "bird"], ["🐤", "chick"], ["🦄", "unicorn"], ["🐝", "bee"],
      ["🦋", "butterfly"], ["🐌", "snail"], ["🐞", "ladybug"], ["🐢", "turtle"], ["🐍", "snake"], ["🦎", "lizard"], ["🐙", "octopus"], ["🦑", "squid"],
      ["🐠", "fish"], ["🐟", "fish"], ["🐡", "blowfish"], ["🦈", "shark"], ["🐳", "whale"], ["🐋", "whale"], ["🦀", "crab"], ["🦞", "lobster"],
      ["🐴", "horse"], ["🦓", "zebra"], ["🦒", "giraffe"], ["🐘", "elephant"], ["🦏", "rhinoceros"], ["🦛", "hippo"], ["🐪", "camel"], ["🐫", "two hump camel"],
      ["🦘", "kangaroo"], ["🦬", "bison"], ["🦌", "deer"], ["🐐", "goat"], ["🐑", "sheep"], ["🐏", "ram"], ["🐕", "dog"], ["🐩", "poodle"],
      ["🐈", "cat"], ["🐓", "rooster"], ["🦃", "turkey"], ["🦆", "duck"], ["🦢", "swan"], ["🦉", "owl"], ["🦅", "eagle"], ["🦜", "parrot"],
      ["🦚", "peacock"], ["🦩", "flamingo"], ["🐊", "crocodile"], ["🐅", "tiger"], ["🐆", "leopard"], ["🦍", "gorilla"], ["🦧", "orangutan"], ["🐒", "monkey"],
      ["🦇", "bat"], ["🐺", "wolf"], ["🦝", "raccoon"], ["🦨", "skunk"], ["🦡", "badger"], ["🦦", "otter"], ["🦥", "sloth"], ["🦫", "beaver"],
      ["🦂", "scorpion"], ["🕷️", "spider"], ["🕸️", "spider web"], ["🐜", "ant"], ["🐛", "bug"], ["🪲", "beetle"], ["🪳", "cockroach"], ["🦗", "cricket"],
      ["🐋", "whale"], ["🐬", "dolphin"], ["🦭", "seal"], ["🦦", "otter"], ["🐊", "alligator"], ["🐉", "dragon"], ["🐲", "dragon face"], ["🦕", "sauropod dinosaur"],
      ["🦖", "t rex dinosaur"], ["🦎", "reptile"], ["🪼", "jellyfish"], ["🦪", "oyster"], ["🪸", "coral"], ["🦐", "shrimp"], ["🦭", "seal"], ["🐚", "shell"],
    ],
  },
  {
    id: "food",
    label: "Comida",
    icon: "🍔",
    emojis: [
      ["🍎", "apple"], ["🍐", "pear"], ["🍊", "orange"], ["🍋", "lemon"], ["🍌", "banana"], ["🍉", "watermelon"], ["🍇", "grapes"], ["🍓", "strawberry"],
      ["🫐", "blueberry"], ["🍒", "cherries"], ["🍑", "peach"], ["🍍", "pineapple"], ["🥝", "kiwi"], ["🍅", "tomato"], ["🥑", "avocado"], ["🌽", "corn"],
      ["🍕", "pizza"], ["🍔", "burger"], ["🍟", "fries"], ["🌭", "hot dog"], ["🌮", "taco"], ["🌯", "burrito"], ["🍿", "popcorn"], ["🍣", "sushi"],
      ["🍜", "ramen"], ["🍝", "spaghetti"], ["🍩", "donut"], ["🍪", "cookie"], ["🎂", "cake"], ["🍰", "shortcake"], ["🍫", "chocolate"], ["🍭", "lollipop"],
      ["☕", "coffee"], ["🧋", "bubble tea"], ["🥤", "drink"], ["🍵", "tea"], ["🧃", "juice"], ["🍺", "beer"], ["🍹", "cocktail"], ["🍷", "wine"],
      ["🥐", "croissant"], ["🥖", "baguette"], ["🥨", "pretzel"], ["🧀", "cheese"], ["🥚", "egg"], ["🍳", "fried egg"], ["🥓", "bacon"], ["🥩", "steak"],
      ["🍗", "chicken leg"], ["🍖", "meat bone"], ["🌮", "taco"], ["🥪", "sandwich"], ["🥗", "salad"], ["🥣", "bowl"], ["🍲", "stew"], ["🍛", "curry rice"],
      ["🍚", "rice"], ["🍙", "rice ball"], ["🍘", "rice cracker"], ["🍥", "fish cake"], ["🥟", "dumpling"], ["🥠", "fortune cookie"], ["🥮", "moon cake"], ["🍱", "bento"],
      ["🍦", "ice cream"], ["🍨", "ice cream bowl"], ["🍧", "shaved ice"], ["🍮", "custard"], ["🍯", "honey"], ["🧁", "cupcake"], ["🥧", "pie"], ["🍬", "candy"],
      ["🍙", "onigiri"], ["🥛", "milk"], ["🍼", "baby bottle"], ["🍶", "sake"], ["🍻", "beer cheers"], ["🥂", "clinking glasses"], ["🥃", "tumbler"], ["🍸", "cocktail glass"],
      ["🥥", "coconut"], ["🥭", "mango"], ["🍈", "melon"], ["🍏", "green apple"], ["🍋", "citrus"], ["🥕", "carrot"], ["🥔", "potato"], ["🍆", "eggplant"],
      ["🥒", "cucumber"], ["🥬", "leafy greens"], ["🥦", "broccoli"], ["🧄", "garlic"], ["🧅", "onion"], ["🍄", "mushroom"], ["🌶️", "hot pepper"], ["🫑", "bell pepper"],
    ],
  },
  {
    id: "activities",
    label: "Atividades",
    icon: "⚽",
    emojis: [
      ["⚽", "soccer"], ["🏀", "basketball"], ["🏈", "football"], ["⚾", "baseball"], ["🎾", "tennis"], ["🏐", "volleyball"], ["🎮", "game videogame"], ["🕹️", "joystick"],
      ["🎯", "target"], ["🎲", "dice"], ["♟️", "chess"], ["🎸", "guitar"], ["🎹", "piano"], ["🎤", "microphone"], ["🎧", "headphones"], ["🎬", "movie"],
      ["🏆", "trophy"], ["🥇", "gold medal"], ["🎉", "party"], ["🎊", "confetti"], ["🎁", "gift"], ["🎈", "balloon"], ["🚀", "rocket"], ["🛸", "ufo"],
      ["🏸", "badminton"], ["🏓", "ping pong"], ["🏒", "ice hockey"], ["🏑", "field hockey"], ["🥍", "lacrosse"], ["🏏", "cricket sport"], ["⛳", "golf"], ["🏹", "archery"],
      ["🥊", "boxing"], ["🥋", "martial arts"], ["🛹", "skateboard"], ["🛼", "roller skate"], ["⛸️", "ice skate"], ["🎿", "ski"], ["🏂", "snowboard"], ["🏄", "surfing"],
      ["🏊", "swimming"], ["🚴", "cycling"], ["🏋️", "weightlifting"], ["🤸", "gymnastics"], ["🤾", "handball"], ["🤽", "water polo"], ["🧘", "meditation"], ["🧗", "climbing"],
      ["🎨", "art painting"], ["🎭", "theater"], ["🎪", "circus"], ["🎟️", "ticket"], ["🎫", "admission"], ["🎼", "music score"], ["🎷", "saxophone"], ["🎺", "trumpet"],
      ["🎻", "violin"], ["🥁", "drum"], ["🪕", "banjo"], ["🎮", "controller"], ["🧩", "puzzle"], ["🃏", "joker card"], ["🎰", "slot"], ["🎳", "bowling"],
      ["🏅", "medal"], ["🥈", "silver medal"], ["🥉", "bronze medal"], ["🏆", "champion"], ["🏟️", "stadium"], ["🎆", "fireworks"], ["🎇", "sparkler"], ["🪅", "pinata"],
    ],
  },
  {
    id: "objects",
    label: "Objetos",
    icon: "💡",
    emojis: [
      ["💡", "idea light"], ["📱", "phone"], ["💻", "computer"], ["⌨️", "keyboard"], ["🖱️", "mouse"], ["📷", "camera"], ["📺", "tv"], ["🎧", "headphones"],
      ["📚", "books"], ["📖", "book"], ["📝", "memo"], ["✏️", "pencil"], ["🔒", "lock"], ["🔑", "key"], ["💎", "gem"], ["🔔", "bell"],
      ["⚙️", "gear"], ["🔧", "tool"], ["🧪", "test tube"], ["🔬", "microscope"], ["💰", "money"], ["💳", "card"], ["📦", "package"], ["✉️", "email"],
      ["🖥️", "desktop"], ["🖨️", "printer"], ["💾", "floppy disk"], ["💿", "cd"], ["📀", "dvd"], ["📡", "antenna"], ["🔋", "battery"], ["🔌", "plug"],
      ["📟", "pager"], ["📞", "telephone"], ["☎️", "phone"], ["📠", "fax"], ["📻", "radio"], ["🎥", "video camera"], ["📹", "camcorder"], ["🎙️", "studio microphone"],
      ["🗂️", "folders"], ["📂", "open folder"], ["📁", "folder"], ["🗃️", "card file box"], ["🗄️", "file cabinet"], ["📎", "paperclip"], ["🖇️", "linked paperclips"], ["📌", "pushpin"],
      ["📍", "location pin"], ["📐", "triangle ruler"], ["📏", "ruler"], ["✂️", "scissors"], ["🗑️", "trash"], ["🔍", "magnifying glass"], ["🔎", "search"], ["🔐", "locked key"],
      ["🧰", "toolbox"], ["🪛", "screwdriver"], ["🔨", "hammer"], ["🪚", "saw"], ["🔩", "nut bolt"], ["🪜", "ladder"], ["🧲", "magnet"], ["🧯", "fire extinguisher"],
      ["🚪", "door"], ["🛋️", "couch"], ["🪑", "chair"], ["🛏️", "bed"], ["🚿", "shower"], ["🛁", "bathtub"], ["🪞", "mirror"], ["🧴", "lotion bottle"],
      ["🎒", "backpack"], ["👜", "handbag"], ["💼", "briefcase"], ["👓", "glasses"], ["🕶️", "sunglasses"], ["🎩", "top hat"], ["👑", "crown"], ["💍", "ring"],
    ],
  },
  {
    id: "symbols",
    label: "Símbolos",
    icon: "❤️",
    emojis: [
      ["❤️", "red heart"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"], ["💙", "blue heart"], ["💜", "purple heart"], ["🖤", "black heart"], ["🤍", "white heart"],
      ["💔", "broken heart"], ["❣️", "heart exclamation"], ["💕", "two hearts"], ["💞", "revolving hearts"], ["💓", "beating heart"], ["💗", "growing heart"], ["💖", "sparkling heart"], ["💘", "heart arrow"],
      ["🔥", "fire"], ["✨", "sparkles"], ["⭐", "star"], ["🌟", "glowing star"], ["💫", "dizzy"], ["💥", "boom"], ["💯", "hundred"], ["❗", "exclamation"],
      ["❓", "question"], ["‼️", "double exclamation"], ["⁉️", "question exclamation"], ["✅", "check"], ["❌", "cross"], ["⚠️", "warning"], ["🚫", "prohibited"], ["💤", "sleep"],
      ["💟", "heart decoration"], ["💝", "heart ribbon"], ["💗", "pink heart"], ["🩷", "pink heart"], ["🩵", "light blue heart"], ["🩶", "grey heart"], ["🤎", "brown heart"], ["❤️‍🔥", "heart fire"],
      ["❤️‍🩹", "healing heart"], ["💌", "love letter"], ["💋", "kiss mark"], ["💐", "bouquet"], ["🌹", "rose"], ["🌸", "cherry blossom"], ["🌺", "hibiscus"], ["🌻", "sunflower"],
      ["☀️", "sun"], ["🌙", "moon"], ["🌈", "rainbow"], ["☁️", "cloud"], ["🌧️", "rain"], ["⛈️", "storm"], ["❄️", "snowflake"], ["⚡", "lightning"],
      ["☄️", "comet"], ["🌌", "milky way"], ["🌍", "earth"], ["🌎", "earth americas"], ["🌏", "earth asia"], ["🌑", "new moon"], ["🌕", "full moon"], ["🌞", "sun face"],
      ["✔️", "check mark"], ["☑️", "check box"], ["➕", "plus"], ["➖", "minus"], ["✖️", "multiply"], ["➗", "divide"], ["♾️", "infinity"], ["💲", "dollar"],
      ["🔴", "red circle"], ["🟠", "orange circle"], ["🟡", "yellow circle"], ["🟢", "green circle"], ["🔵", "blue circle"], ["🟣", "purple circle"], ["⚫", "black circle"], ["⚪", "white circle"],
      ["🔺", "red triangle"], ["🔻", "down triangle"], ["🔶", "orange diamond"], ["🔷", "blue diamond"], ["🔸", "small orange diamond"], ["🔹", "small blue diamond"], ["▪️", "black square"], ["▫️", "white square"],
      ["©️", "copyright"], ["®️", "registered"], ["™️", "trademark"], ["#️⃣", "hash"], ["*️⃣", "asterisk"], ["0️⃣", "zero"], ["1️⃣", "one"], ["2️⃣", "two"],
    ],
  },
];

const RECENT = ["😀", "😂", "😍", "🥹", "😎", "😭", "😡", "👍", "❤️", "🔥", "🎉", "🚀"];

export default function EmojiPicker({ onSelect }) {
  const [activeCategory, setActiveCategory] = useState("people");
  const [query, setQuery] = useState("");

  const active = CATEGORIES.find((category) => category.id === activeCategory) || CATEGORIES[0];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return active.emojis;
    return CATEGORIES.flatMap((category) => category.emojis).filter(([, keywords]) => keywords.includes(normalized));
  }, [active, query]);

  function selectEmoji(emoji) {
    onSelect(emoji);
  }

  return (
    <div className="emoji-picker" role="dialog" aria-label="Seletor de emojis" onClick={(event) => event.stopPropagation()}>
      <div className="emoji-picker-tabs">
        <button type="button" className="emoji-tab muted" disabled>GIFs</button>
        <button type="button" className="emoji-tab muted" disabled>Figurinha</button>
        <button type="button" className="emoji-tab active">Emoji</button>
        <span className="emoji-picker-feature">👋</span>
      </div>

      <div className="emoji-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder=":smile:"
          aria-label="Pesquisar emoji"
        />
      </div>

      <div className="emoji-picker-body">
        <nav className="emoji-category-rail" aria-label="Categorias de emoji">
          <button type="button" className={!query ? "category-button recent" : "category-button"} onClick={() => { setQuery(""); setActiveCategory("people"); }} aria-label="Recentes">◷</button>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={!query && activeCategory === category.id ? "category-button selected" : "category-button"}
              onClick={() => { setQuery(""); setActiveCategory(category.id); }}
              aria-label={category.label}
              title={category.label}
            >
              {category.icon}
            </button>
          ))}
        </nav>

        <div className="emoji-grid-wrap">
          <div className="emoji-category-title">{query ? "Resultados" : active.label}</div>
          <div className="emoji-grid">
            {filtered.map(([emoji, keywords], index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                className="emoji-cell"
                onClick={() => selectEmoji(emoji)}
                aria-label={keywords}
                title={keywords}
              >
                {emoji}
              </button>
            ))}
            {!filtered.length && <div className="emoji-empty">Nenhum emoji encontrado.</div>}
          </div>
        </div>
      </div>

      <div className="emoji-picker-footer">
        <span className="emoji-preview">{filtered[0]?.[0] || "🙂"}</span>
        <span>Selecione um emoji</span>
      </div>
    </div>
  );
}
