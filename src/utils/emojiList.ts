export interface EmojiItem {
  emoji: string;
  name: string;
  category: 'faces' | 'animals' | 'halloween' | 'fun' | 'symbols';
  keywords: string[];
}

export const EMOJI_CATEGORIES = [
  { id: 'all', label: 'Tous', labelEn: 'All', icon: '✨' },
  { id: 'faces', label: 'Visages', labelEn: 'Faces', icon: '😀' },
  { id: 'animals', label: 'Animaux', labelEn: 'Animals', icon: '🐱' },
  { id: 'halloween', label: 'Fête & Masques', labelEn: 'Costumes', icon: '🎃' },
  { id: 'fun', label: 'Fun & Objets', labelEn: 'Fun', icon: '🚀' },
  { id: 'symbols', label: 'Symboles', labelEn: 'Symbols', icon: '⭐' },
] as const;

export const EMOJI_LIST: EmojiItem[] = [
  // --- Faces & Expressions ---
  { emoji: '😎', name: 'Cool', category: 'faces', keywords: ['cool', 'lunettes', 'sunglasses', 'style', 'sun'] },
  { emoji: '😀', name: 'Sourire', category: 'faces', keywords: ['sourire', 'smile', 'happy', 'content', 'joie'] },
  { emoji: '🥳', name: 'Fête', category: 'faces', keywords: ['fete', 'party', 'anniversaire', 'celebration'] },
  { emoji: '🤩', name: 'Étoiles', category: 'faces', keywords: ['etoile', 'star', 'yeux', 'fan', 'incroyable'] },
  { emoji: '😇', name: 'Ange', category: 'faces', keywords: ['ange', 'angel', 'sage', 'innocent', 'aureole'] },
  { emoji: '🤓', name: 'Intello', category: 'faces', keywords: ['intello', 'nerd', 'lunettes', 'geek'] },
  { emoji: '🤗', name: 'Câlin', category: 'faces', keywords: ['calin', 'hug', 'mains', 'amour'] },
  { emoji: '🤠', name: 'Cowboy', category: 'faces', keywords: ['cowboy', 'chapeau', 'sherif', 'western'] },
  { emoji: '😜', name: 'Farceur', category: 'faces', keywords: ['langue', 'clin d oeil', 'wink', 'tongue', 'farce'] },
  { emoji: '🤫', name: 'Chut', category: 'faces', keywords: ['chut', 'secret', 'discretion', 'silence', 'shh'] },
  { emoji: '🤭', name: 'Discret', category: 'faces', keywords: ['rire', 'glousser', 'main sur la bouche', 'giggle'] },
  { emoji: '🤔', name: 'Penseur', category: 'faces', keywords: ['penseur', 'reflexion', 'thinking', 'idee'] },
  { emoji: '😷', name: 'Masque', category: 'faces', keywords: ['masque', 'medical', 'mask', 'protection'] },
  { emoji: '😴', name: 'Dodo', category: 'faces', keywords: ['sommeil', 'dort', 'sleep', 'repos', 'zzz'] },
  { emoji: '😋', name: 'Gourmand', category: 'faces', keywords: ['gourmand', 'miam', 'yummy', 'bon'] },
  { emoji: '😍', name: 'Amoureux', category: 'faces', keywords: ['coeur', 'yeux', 'amour', 'love', 'in love'] },

  // --- Halloween & Costumes ---
  { emoji: '🎃', name: 'Citrouille', category: 'halloween', keywords: ['citrouille', 'pumpkin', 'halloween', 'jack o lantern', 'fete'] },
  { emoji: '👻', name: 'Fantôme', category: 'halloween', keywords: ['fantome', 'ghost', 'peur', 'halloween', 'blanc'] },
  { emoji: '🎭', name: 'Masque Théâtre', category: 'halloween', keywords: ['masque', 'theatre', 'drama', 'costume', 'degisement', 'carnaval'] },
  { emoji: '🧙', name: 'Sorcier', category: 'halloween', keywords: ['sorcier', 'sorciere', 'wizard', 'witch', 'magie', 'halloween'] },
  { emoji: '🧛', name: 'Vampire', category: 'halloween', keywords: ['vampire', 'dracula', 'chauve souris', 'nuit'] },
  { emoji: '🧟', name: 'Zombie', category: 'halloween', keywords: ['zombie', 'monstre', 'undead', 'halloween'] },
  { emoji: '🦸', name: 'Super-héros', category: 'halloween', keywords: ['super hero', 'heros', 'cape', 'force'] },
  { emoji: '🦹', name: 'Vilain', category: 'halloween', keywords: ['vilain', 'mechant', 'villain', 'masque'] },
  { emoji: '🧚', name: 'Fée', category: 'halloween', keywords: ['fee', 'fairy', 'magie', 'ailes'] },
  { emoji: '💀', name: 'Crâne', category: 'halloween', keywords: ['crane', 'skull', 'squelette', 'skeleton', 'mort'] },
  { emoji: '🕷️', name: 'Araignée', category: 'halloween', keywords: ['araignee', 'spider', 'toile', 'halloween'] },
  { emoji: '🦇', name: 'Chauve-souris', category: 'halloween', keywords: ['chauve souris', 'bat', 'nuit', 'vol'] },

  // --- Cute Animals ---
  { emoji: '🐱', name: 'Chat', category: 'animals', keywords: ['chat', 'cat', 'kitten', 'minou', 'mignon'] },
  { emoji: '🐶', name: 'Chien', category: 'animals', keywords: ['chien', 'dog', 'puppy', 'toutou'] },
  { emoji: '🦊', name: 'Renard', category: 'animals', keywords: ['renard', 'fox', 'roux', 'rusé'] },
  { emoji: '🐼', name: 'Panda', category: 'animals', keywords: ['panda', 'bambou', 'ours', 'chine'] },
  { emoji: '🦁', name: 'Lion', category: 'animals', keywords: ['lion', 'roi', 'criniere', 'savane'] },
  { emoji: '🐯', name: 'Tigre', category: 'animals', keywords: ['tigre', 'tiger', 'rayures', 'fauve'] },
  { emoji: '🐻', name: 'Ours', category: 'animals', keywords: ['ours', 'bear', 'ourson', 'teddy'] },
  { emoji: '🐰', name: 'Lapin', category: 'animals', keywords: ['lapin', 'rabbit', 'bunny', 'oreilles'] },
  { emoji: '🐸', name: 'Grenouille', category: 'animals', keywords: ['grenouille', 'frog', 'vert', 'nenuphar'] },
  { emoji: '🐵', name: 'Singe', category: 'animals', keywords: ['singe', 'monkey', 'banane', 'malin'] },
  { emoji: '🦄', name: 'Licorne', category: 'animals', keywords: ['licorne', 'unicorn', 'arc en ciel', 'magique', 'corne'] },
  { emoji: '🐨', name: 'Koala', category: 'animals', keywords: ['koala', 'australie', 'eucalyptus', 'doux'] },
  { emoji: '🦉', name: 'Chouette', category: 'animals', keywords: ['chouette', 'hibou', 'owl', 'nuit', 'yeux'] },
  { emoji: '🐧', name: 'Pingouin', category: 'animals', keywords: ['pingouin', 'manchot', 'penguin', 'banquise'] },
  { emoji: '🐥', name: 'Poussin', category: 'animals', keywords: ['poussin', 'chick', 'oiseau', 'jaune'] },
  { emoji: '🐢', name: 'Tortue', category: 'animals', keywords: ['tortue', 'turtle', 'carapace'] },
  { emoji: '🐬', name: 'Dauphin', category: 'animals', keywords: ['dauphin', 'dolphin', 'mer', 'ocean'] },
  { emoji: '🦋', name: 'Papillon', category: 'animals', keywords: ['papillon', 'butterfly', 'ailes', 'nature'] },

  // --- Fun & Objects ---
  { emoji: '🚀', name: 'Fusée', category: 'fun', keywords: ['fusee', 'rocket', 'espace', 'spatial', 'etoile'] },
  { emoji: '🤖', name: 'Robot', category: 'fun', keywords: ['robot', 'cyborg', 'ia', 'tech', 'metal'] },
  { emoji: '👾', name: 'Monstre Pixel', category: 'fun', keywords: ['alien', 'pixel', 'jeu video', 'retro', 'space invader'] },
  { emoji: '👑', name: 'Couronne', category: 'fun', keywords: ['couronne', 'crown', 'roi', 'reine', 'royal'] },
  { emoji: '🎈', name: 'Ballon', category: 'fun', keywords: ['ballon', 'balloon', 'fete', 'rouge', 'anniversaire'] },
  { emoji: '🎨', name: 'Palette Art', category: 'fun', keywords: ['art', 'dessin', 'peinture', 'palette', 'couleur'] },
  { emoji: '⚽', name: 'Football', category: 'fun', keywords: ['football', 'ballon', 'foot', 'soccer', 'sport'] },
  { emoji: '🏀', name: 'Basketball', category: 'fun', keywords: ['basket', 'basketball', 'panier', 'sport'] },
  { emoji: '🍩', name: 'Donut', category: 'fun', keywords: ['donut', 'beignet', 'gourmandise', 'sucre'] },
  { emoji: '🍪', name: 'Cookie', category: 'fun', keywords: ['cookie', 'biscuit', 'chocolat'] },
  { emoji: '🍭', name: 'Sucette', category: 'fun', keywords: ['sucette', 'candy', 'bonbon', 'sucre'] },
  { emoji: '🍕', name: 'Pizza', category: 'fun', keywords: ['pizza', 'fromage', 'italie', 'repas'] },

  // --- Symbols & Magic ---
  { emoji: '⭐', name: 'Étoile', category: 'symbols', keywords: ['etoile', 'star', 'or', 'jaune'] },
  { emoji: '🌟', name: 'Brillance', category: 'symbols', keywords: ['etoile', 'brillant', 'sparkle', 'eclat'] },
  { emoji: '🛡️', name: 'Bouclier', category: 'symbols', keywords: ['bouclier', 'shield', 'securite', 'rgpd', 'defense'] },
  { emoji: '💖', name: 'Cœur Étincelant', category: 'symbols', keywords: ['coeur', 'heart', 'amour', 'love', 'rose'] },
  { emoji: '🌸', name: 'Fleur Cerisier', category: 'symbols', keywords: ['fleur', 'flower', 'cerisier', 'rose', 'printemps'] },
  { emoji: '🌈', name: 'Arc-en-ciel', category: 'symbols', keywords: ['arc en ciel', 'rainbow', 'couleurs', 'ciel'] },
  { emoji: '🕶️', name: 'Lunettes Noires', category: 'symbols', keywords: ['lunettes', 'sunglasses', 'espion', 'mystere'] },
  { emoji: '☀️', name: 'Soleil', category: 'symbols', keywords: ['soleil', 'sun', 'lumiere', 'ete'] },
];

/**
 * Filter emoji list by search term and category
 */
export function filterEmojis(searchTerm: string, category: string = 'all'): EmojiItem[] {
  const norm = searchTerm.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return EMOJI_LIST.filter((item) => {
    // Category check
    if (category !== 'all' && item.category !== category) {
      return false;
    }

    if (!norm) return true;

    // Direct emoji match
    if (item.emoji.includes(norm)) return true;

    // Name match
    const normName = item.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normName.includes(norm)) return true;

    // Keyword match
    return item.keywords.some((kw) => {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normKw.includes(norm);
    });
  });
}
