export type TopStyle =
  | 'hoodie'
  | 'varsity'
  | 'tee'
  | 'corset'
  | 'bodysuit'
  | 'emma-corset'
  | 'hela-armor'
  | 'magneto-armor'
  | 'quicksilver-suit'
  | 'strange-tunic'
  | 'vision-suit'
  | 'agatha-gown'
  | 'invisible-suit';
export type PantsStyle = 'joggers' | 'shorts' | 'jeans' | 'tights';
export type HatStyle = 'none' | 'beanie' | 'cap' | 'tiara' | 'magneto-helm';
export type CharacterArchetype =
  | 'standard'
  | 'scarlet-witch'
  | 'phoenix-force'
  | 'emma-frost'
  | 'hela'
  | 'magneto'
  | 'quicksilver'
  | 'doctor-strange'
  | 'vision'
  | 'agatha-harkness'
  | 'invisible-woman'
  | 'npc-thug'
  | 'npc-bandit'
  | 'npc-prisoner'
  | 'npc-basic';
export type PhoenixSkinVariant = 'phoenix' | 'dark-phoenix' | 'white-phoenix';
export type CharacterSkinId =
  | 'supreme-sorceress'
  | 'wanda-zombie'
  | 'white-hela'
  | 'white-queen'
  | 'white-phoenix'
  | 'ancient-one'
  | 'speed';

export interface CharacterAppearance {
  archetype?: CharacterArchetype;
  skinVariant?: PhoenixSkinVariant;
  skinId?: CharacterSkinId;
  skin: string;
  hair: string;
  hairSecondary?: string;
  topPrimary: string;
  topSecondary: string;
  topAccent: string;
  emblemColor?: string;
  sashColor?: string;
  pantsPrimary: string;
  pantsAccent: string;
  shoePrimary: string;
  shoeSole: string;
  shoeAccent: string;
  topStyle: TopStyle;
  pantsStyle: PantsStyle;
  hatStyle: HatStyle;
  hatColor: string;
}

export const CHARACTER_PRESETS: Record<string, CharacterAppearance> = {
  scarletWitch: {
    archetype: 'scarlet-witch',
    skin: '#F3C5AC',
    hair: '#4A251D',
    hairSecondary: '#321712',
    topPrimary: '#CE192A', // Classic scarlet corset bodysuit
    topSecondary: '#EE738E', // Soft rose-pink sleeves / sheer fabric
    topAccent: '#9E0B1B', // Deep crimson bodice trim & cape lining
    pantsPrimary: '#EE738E', // Rose-pink tights
    pantsAccent: '#CE192A', // Scarlet hip V-cut & belt accents
    shoePrimary: '#C61626', // Scarlet knee-high boots
    shoeSole: '#7A0D18',
    shoeAccent: '#E82E3F',
    topStyle: 'corset',
    pantsStyle: 'tights',
    hatStyle: 'tiara',
    hatColor: '#D61C2C',
  },
  supremeSorceress: {
    archetype: 'scarlet-witch',
    skinId: 'supreme-sorceress',
    skin: '#F3C5AC',
    hair: '#421D15', // Rich dark-brown full curls
    hairSecondary: '#27100B',
    topPrimary: '#4A1836', // Deep plum-burgundy suit
    topSecondary: '#C81E2B', // Crimson collar & glove fade
    topAccent: '#120C14', // Deep black V-corset & upper sleeves
    emblemColor: '#E8B938', // Gold Eye of Agamotto & cape embroidery
    sashColor: '#D61E2E', // Crimson hip-fin wings
    pantsPrimary: '#4A1836',
    pantsAccent: '#C81E2B', // Crimson thigh chevrons
    shoePrimary: '#1A0B14',
    shoeSole: '#0E060B',
    shoeAccent: '#C81E2B',
    topStyle: 'corset',
    pantsStyle: 'tights',
    hatStyle: 'tiara',
    hatColor: '#FF2A3C', // Glowing crimson 2-pronged tiara
  },
  wandaZombie: {
    archetype: 'scarlet-witch',
    skinId: 'wanda-zombie',
    skin: '#7A857C', // Decayed grey-greenish undead skin
    hair: '#3A1416', // Disheveled dark crimson-brown hair
    hairSecondary: '#1C080A',
    topPrimary: '#941722', // Tattered crimson long coat & laced corset
    topSecondary: '#7A121C',
    topAccent: '#2A080C', // Dark corset lacing & coat edges
    emblemColor: '#FF4524', // Glowing fierce red/orange eyes & hands
    sashColor: '#7A121C',
    pantsPrimary: '#221F24', // Torn dark charcoal pants
    pantsAccent: '#7A857C', // Grey undead skin peeking through tears
    shoePrimary: '#1E1418',
    shoeSole: '#100A0C',
    shoeAccent: '#7A121C',
    topStyle: 'corset',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#941722',
  },
  agathaHarkness: {
    archetype: 'agatha-harkness',
    skin: '#ECC4B2', // Fair porcelain skin
    hair: '#2E1C18', // Voluminous dark wavy brown hair
    hairSecondary: '#1B0F0D',
    topPrimary: '#133C4A', // Deep teal-navy pleated gown
    topSecondary: '#2E1F54', // Purple-indigo striped shawl
    topAccent: '#111F2A', // Dark lace bodice trim
    emblemColor: '#DFC072', // Oval gold & pearl cameo brooch
    sashColor: '#482475', // Deep violet shawl stripe accents
    pantsPrimary: '#102D38', // Pleated teal lower gown
    pantsAccent: '#251742',
    shoePrimary: '#141722',
    shoeSole: '#0A0B10',
    shoeAccent: '#7E35C4',
    topStyle: 'agatha-gown',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#133C4A',
  },
  phoenixForce: {
    archetype: 'phoenix-force',
    skinVariant: 'phoenix',
    skin: '#F4C3A8',
    hair: '#B8341A', // Vibrant fiery copper-red hair
    hairSecondary: '#84200E',
    topPrimary: '#278E38', // Classic emerald green bodysuit
    topSecondary: '#F2C12E', // Bright gold long gloves
    topAccent: '#14171C', // Sleek black high collar
    emblemColor: '#FFD53D', // Gold Phoenix bird chest emblem
    sashColor: '#F2C12E', // Flowing gold waist sash
    pantsPrimary: '#278E38', // Emerald green upper thighs
    pantsAccent: '#F2C12E', // Gold sash waist trim
    shoePrimary: '#F2C12E', // Metallic gold thigh-high boots
    shoeSole: '#B3820D',
    shoeAccent: '#FFE680',
    topStyle: 'bodysuit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#278E38',
  },
  darkPhoenix: {
    archetype: 'phoenix-force',
    skinVariant: 'dark-phoenix',
    skin: '#F0BEA4',
    hair: '#2B0D0F', // Deep dark crimson-black hair
    hairSecondary: '#5A1618',
    topPrimary: '#14141B', // Sleek dark obsidian bodysuit
    topSecondary: '#C82218', // Deep fiery crimson-red long gloves
    topAccent: '#0B0B10', // High black collar
    emblemColor: '#FF451A', // Intense orange-crimson Phoenix chest emblem
    sashColor: '#E83D1B', // Fiery orange-red flowing waist sash
    pantsPrimary: '#14141B', // Dark obsidian upper thighs
    pantsAccent: '#E83D1B', // Crimson-orange waist sash accent
    shoePrimary: '#C82218', // Crimson-red thigh-high boots
    shoeSole: '#73100C',
    shoeAccent: '#FF642E',
    topStyle: 'bodysuit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#14141B',
  },
  whitePhoenix: {
    archetype: 'phoenix-force',
    skinVariant: 'white-phoenix',
    skinId: 'white-phoenix',
    skin: '#F4C3A8',
    hair: '#C43218', // Flowing copper-red hair
    hairSecondary: '#8A1C0C',
    topPrimary: '#F5F7FA', // Crisp pearl-white bodysuit
    topSecondary: '#F5F7FA', // Pearl-white long gloves
    topAccent: '#14171C', // Sleek black high collar
    emblemColor: '#F2C12E', // Metallic gold Phoenix V-crest
    sashColor: '#F2C12E', // Gold diagonal waist sash
    pantsPrimary: '#F5F7FA', // White upper thighs
    pantsAccent: '#F2C12E', // Gold sash & trim
    shoePrimary: '#F2C12E', // Metallic gold thigh-high boots
    shoeSole: '#B3820D',
    shoeAccent: '#FFE680',
    topStyle: 'bodysuit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#F5F7FA',
  },
  emmaFrost: {
    archetype: 'emma-frost',
    skin: '#F3C4AC',
    hair: '#F0C65A',
    hairSecondary: '#D1A03B',
    topPrimary: '#F5F7FA', // White strapped corset crop top
    topSecondary: '#F5F7FA', // White long opera gloves & cape
    topAccent: '#C9D3E0', // Crisp silver-white corset seams & choker trim
    emblemColor: '#D62828', // Iconic circular red/gold X-clasp emblem
    sashColor: '#F4C430',
    pantsPrimary: '#F2F5F8', // Sleek white pants
    pantsAccent: '#D4DCE6', // Tailored belt & seams
    shoePrimary: '#EFF3F7', // White heeled boots
    shoeSole: '#B8C2CE',
    shoeAccent: '#FFFFFF',
    topStyle: 'emma-corset',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#F5F7FA',
  },
  whiteQueen: {
    archetype: 'emma-frost',
    skinId: 'white-queen',
    skin: '#F3C4AC',
    hair: '#F0C65A', // Blonde shoulder-length hair
    hairSecondary: '#D1A03B',
    topPrimary: '#F5F7FA', // White front-laced corset
    topSecondary: '#F5F7FA', // White opera gloves & cape
    topAccent: '#D6DFEC', // Silver-white fur & lacing accents
    emblemColor: '#D62828', // Red/gold circular ruby brooch
    sashColor: '#F4C430',
    pantsPrimary: '#F5F7FA', // White briefs + bare thighs in texture
    pantsAccent: '#D6DFEC',
    shoePrimary: '#F3F6FA', // White thigh-high boots
    shoeSole: '#B8C2CE',
    shoeAccent: '#FFFFFF',
    topStyle: 'emma-corset',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#F5F7FA',
  },
  hela: {
    archetype: 'hela',
    skin: '#EAC2AC',
    hair: '#15171C', // Tousled jet-black wavy hair
    hairSecondary: '#0A0B0E',
    topPrimary: '#151B1E', // Dark scaly black-teal armor bodysuit
    topSecondary: '#1B2E28', // Deep emerald-black scale plates
    topAccent: '#2CE66D', // Emerald accents
    emblemColor: '#8DA89E', // Silver-emerald vertical chest ribs
    sashColor: '#1F3A30',
    pantsPrimary: '#151B1E', // Dark armored leggings
    pantsAccent: '#48685B', // Silver-emerald leg trim
    shoePrimary: '#111618', // Dark armored boots
    shoeSole: '#0A0D0E',
    shoeAccent: '#5C8574',
    topStyle: 'hela-armor',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#13241D',
  },
  whiteHela: {
    archetype: 'hela',
    skinId: 'white-hela',
    skin: '#E6BCA6',
    hair: '#15171C',
    hairSecondary: '#0A0B0E',
    topPrimary: '#F2F5F8', // Pearl-white sculpted armor
    topSecondary: '#DCE3EC', // Alabaster collar/pauldrons/cape
    topAccent: '#9EA9B6', // Crisp silver-grey geometric seams
    emblemColor: '#9AA6B4', // Silver-grey chest trim lines
    sashColor: '#E4EAF0',
    pantsPrimary: '#F2F5F8',
    pantsAccent: '#9EA9B6',
    shoePrimary: '#ECEFF4',
    shoeSole: '#9AA6B4',
    shoeAccent: '#FFFFFF',
    topStyle: 'hela-armor',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#F2F5F8',
  },
  magneto: {
    archetype: 'magneto',
    skin: '#ECC2AC',
    hair: '#DCE2EB',
    hairSecondary: '#B3BCC9',
    topPrimary: '#C61C2C', // Crimson armor bodysuit
    topSecondary: '#5D238A', // Deep metallic purple gauntlets & trim
    topAccent: '#8236BD', // Bright magnetic violet accent
    emblemColor: '#5D238A',
    sashColor: '#6C2BA0',
    pantsPrimary: '#C61C2C',
    pantsAccent: '#5D238A',
    shoePrimary: '#5D238A',
    shoeSole: '#341152',
    shoeAccent: '#9A4CE0',
    topStyle: 'magneto-armor',
    pantsStyle: 'tights',
    hatStyle: 'magneto-helm',
    hatColor: '#C61C2C',
  },
  quicksilver: {
    archetype: 'quicksilver',
    skin: '#F3C5AC',
    hair: '#EAEFF6', // Signature silver-white swept hair
    hairSecondary: '#BAC6D8',
    topPrimary: '#1D84D6', // Vibrant sky-blue speedster suit
    topSecondary: '#1A2238', // Dark forearm bracers
    topAccent: '#F3FAFF', // White lightning sash & seam lines
    emblemColor: '#F3FAFF',
    sashColor: '#3BF28E',
    pantsPrimary: '#1D84D6',
    pantsAccent: '#F3FAFF',
    shoePrimary: '#1B243B',
    shoeSole: '#111624',
    shoeAccent: '#F3FAFF',
    topStyle: 'quicksilver-suit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#EAEFF6',
  },
  speed: {
    archetype: 'quicksilver',
    skinId: 'speed',
    skin: '#F3C5AC',
    hair: '#EAEFF6', // Swept spiky silver-white hair
    hairSecondary: '#B8C4D6',
    topPrimary: '#154C2D', // Deep metallic emerald armored suit
    topSecondary: '#0C1E14', // Dark emerald-black cowl & bracer guards
    topAccent: '#EEF4FA', // Bright silver-white side rib & thigh stripes
    emblemColor: '#FF8822', // Amber-orange speedster goggle lenses
    sashColor: '#4DFF9E',
    pantsPrimary: '#154C2D',
    pantsAccent: '#EEF4FA',
    shoePrimary: '#0D2417',
    shoeSole: '#07120C',
    shoeAccent: '#EEF4FA',
    topStyle: 'quicksilver-suit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#0C1E14',
  },
  doctorStrange: {
    archetype: 'doctor-strange',
    skin: '#EFC0A4',
    hair: '#2E211C', // Dark brown hair with silver temple streaks
    hairSecondary: '#DCE3EE', // Silver-white temple streaks
    topPrimary: '#1E4C96', // Mystic cobalt-blue tunic
    topSecondary: '#183C78',
    topAccent: '#D9A238', // Gold belt & mystic trim
    emblemColor: '#F6C844', // Eye of Agamotto gold
    sashColor: '#4E3426', // Leather waist sash
    pantsPrimary: '#1B253A',
    pantsAccent: '#3D2B22',
    shoePrimary: '#242228',
    shoeSole: '#141318',
    shoeAccent: '#D9A238',
    topStyle: 'strange-tunic',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#B81D28',
  },
  ancientOne: {
    archetype: 'doctor-strange',
    skinId: 'ancient-one',
    skin: '#F3C8AE',
    hair: '#F3C8AE',
    hairSecondary: '#9C4228', // Subtle Dark Dimension forehead sigil
    topPrimary: '#CE9228', // Saffron/ochre outer Sorcerer Supreme robes
    topSecondary: '#E7B84E', // Lighter gold folded collar lapel & inner wrap
    topAccent: '#181A22', // Wide black waist corset belt
    emblemColor: '#F3C964',
    sashColor: '#1B1D26', // Wide black waist corset sash
    pantsPrimary: '#262934', // Dark charcoal trousers below lower robe hem
    pantsAccent: '#48392D', // Dark earth-brown mantle strips
    shoePrimary: '#1A1C24',
    shoeSole: '#0E1016',
    shoeAccent: '#3D352C',
    topStyle: 'strange-tunic',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#CE9228',
  },
  vision: {
    archetype: 'vision',
    skin: '#C2252F', // Synthetic crimson face
    hair: '#1D8B45', // Green cowl/crown framing crimson face
    hairSecondary: '#156A34',
    topPrimary: '#1F9148', // Emerald synthezoid bodysuit
    topSecondary: '#F2BA26', // Golden gauntlets & belt
    topAccent: '#FFD94A', // Radiant yellow highlights
    emblemColor: '#F6C93B', // Gold diamond chest emblem
    sashColor: '#F2BA26',
    pantsPrimary: '#1F9148',
    pantsAccent: '#F2BA26', // Golden trunks/waist
    shoePrimary: '#F2BA26', // Golden boots
    shoeSole: '#B08010',
    shoeAccent: '#FFE875',
    topStyle: 'vision-suit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#1D8B45',
  },
  invisibleWoman: {
    archetype: 'invisible-woman',
    skin: '#F4C6AE',
    hair: '#F0DFAA', // Wavy platinum-blonde hair
    hairSecondary: '#CBB070',
    topPrimary: '#1D7CE8', // Fantastic Four cobalt-blue bodysuit
    topSecondary: '#131A29', // Black collar, side panels & long gloves
    topAccent: '#56BFFF', // Light-cyan Forcefield trim lines
    emblemColor: '#E6F7FF', // Circular cyan-white "4" chest emblem
    sashColor: '#131A29', // Sleek black V-belt
    pantsPrimary: '#1D7CE8', // Cobalt-blue tights
    pantsAccent: '#131A29', // Black belt & side seam trim
    shoePrimary: '#131A29', // Black knee-high boots
    shoeSole: '#0B0E17',
    shoeAccent: '#38BDF8', // Blue boot cuff & buckle trim
    topStyle: 'invisible-suit',
    pantsStyle: 'tights',
    hatStyle: 'none',
    hatColor: '#1D7CE8',
  },
  npcThug: {
    archetype: 'npc-thug',
    skin: '#CFA68A',
    hair: '#22242E',
    topPrimary: '#363C4D',
    topSecondary: '#525B73',
    topAccent: '#9AA3BA',
    pantsPrimary: '#242936',
    pantsAccent: '#3A4154',
    shoePrimary: '#1D202B',
    shoeSole: '#3C4252',
    shoeAccent: '#6B748C',
    topStyle: 'hoodie',
    pantsStyle: 'joggers',
    hatStyle: 'none',
    hatColor: '#363C4D',
  },
  banditDark: {
    archetype: 'npc-bandit',
    skin: '#D6A486',
    hair: '#1D1D24',
    topPrimary: '#262932',
    topSecondary: '#3E4352',
    topAccent: '#B5383E',
    pantsPrimary: '#191C24',
    pantsAccent: '#363C4A',
    shoePrimary: '#14161D',
    shoeSole: '#2B303C',
    shoeAccent: '#B5383E',
    topStyle: 'varsity',
    pantsStyle: 'jeans',
    hatStyle: 'beanie',
    hatColor: '#2E1E24',
  },
  banditCrimson: {
    archetype: 'npc-bandit',
    skin: '#B98768',
    hair: '#2B1F1B',
    topPrimary: '#47252B',
    topSecondary: '#2C2E38',
    topAccent: '#D98A3C',
    pantsPrimary: '#22242D',
    pantsAccent: '#483439',
    shoePrimary: '#181920',
    shoeSole: '#363844',
    shoeAccent: '#D98A3C',
    topStyle: 'hoodie',
    pantsStyle: 'joggers',
    hatStyle: 'cap',
    hatColor: '#3B1E24',
  },
  prisonerOrange: {
    archetype: 'npc-prisoner',
    skin: '#D8A280',
    hair: '#272220',
    topPrimary: '#EB6D24',
    topSecondary: '#D85B16',
    topAccent: '#F8B98B',
    pantsPrimary: '#D85B16',
    pantsAccent: '#A6410B',
    shoePrimary: '#2C2F38',
    shoeSole: '#4A4E5A',
    shoeAccent: '#EB6D24',
    topStyle: 'tee',
    pantsStyle: 'joggers',
    hatStyle: 'none',
    hatColor: '#EB6D24',
  },
  basicCivilianA: {
    archetype: 'npc-basic',
    skin: '#F3C1A0',
    hair: '#432D24',
    topPrimary: '#FF7D6B',
    topSecondary: '#FFF4E8',
    topAccent: '#3CC6B8',
    pantsPrimary: '#374B63',
    pantsAccent: '#526B87',
    shoePrimary: '#F7F3EC',
    shoeSole: '#FFFFFF',
    shoeAccent: '#FF7D6B',
    topStyle: 'hoodie',
    pantsStyle: 'jeans',
    hatStyle: 'none',
    hatColor: '#3CC6B8',
  },
  basicCivilianB: {
    archetype: 'npc-basic',
    skin: '#D99F7A',
    hair: '#231D1B',
    topPrimary: '#48C79F',
    topSecondary: '#F8F4EC',
    topAccent: '#FFB36B',
    pantsPrimary: '#4A445C',
    pantsAccent: '#69607E',
    shoePrimary: '#FAF6F0',
    shoeSole: '#FFFDF9',
    shoeAccent: '#48C79F',
    topStyle: 'varsity',
    pantsStyle: 'shorts',
    hatStyle: 'cap',
    hatColor: '#48C79F',
  },
  coralHoodie: {
    archetype: 'standard',
    skin: '#F5C4A1',
    hair: '#3A2824',
    topPrimary: '#FF6B5A',
    topSecondary: '#FFF3E4',
    topAccent: '#3CC6B8',
    pantsPrimary: '#33465E',
    pantsAccent: '#49617D',
    shoePrimary: '#FAF6F0',
    shoeSole: '#FFFFFF',
    shoeAccent: '#FF6B5A',
    topStyle: 'hoodie',
    pantsStyle: 'joggers',
    hatStyle: 'none',
    hatColor: '#3CC6B8',
  },
  skyVarsity: {
    archetype: 'standard',
    skin: '#ECC09E',
    hair: '#2B2430',
    topPrimary: '#4B8BF5',
    topSecondary: '#FFF7EC',
    topAccent: '#FFC857',
    pantsPrimary: '#3D4859',
    pantsAccent: '#58667B',
    shoePrimary: '#2F3947',
    shoeSole: '#FAF6F0',
    shoeAccent: '#FFC857',
    topStyle: 'varsity',
    pantsStyle: 'jeans',
    hatStyle: 'cap',
    hatColor: '#4B8BF5',
  },
  meadowMint: {
    archetype: 'standard',
    skin: '#D69B76',
    hair: '#221C1A',
    topPrimary: '#44C29A',
    topSecondary: '#F8F4EC',
    topAccent: '#FF8A65',
    pantsPrimary: '#4D455D',
    pantsAccent: '#69607C',
    shoePrimary: '#FAF6F0',
    shoeSole: '#FFFDF9',
    shoeAccent: '#44C29A',
    topStyle: 'tee',
    pantsStyle: 'shorts',
    hatStyle: 'beanie',
    hatColor: '#FF8A65',
  },
};

function sanitizeHex(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  return null;
}

/**
 * Resolves customizable R16 character clothing and colors from presets or URL params
 * while keeping the screen completely clean of extra UI.
 */
export function resolveCharacterAppearance(
  overrides?: Partial<CharacterAppearance>,
): CharacterAppearance {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const presetKey = params.get('preset');
  const base =
    (presetKey && CHARACTER_PRESETS[presetKey]) || CHARACTER_PRESETS.scarletWitch;

  const topStyleParam = params.get('topStyle') as TopStyle | null;
  const pantsStyleParam = params.get('pantsStyle') as PantsStyle | null;
  const hatStyleParam = params.get('hatStyle') as HatStyle | null;

  return {
    ...base,
    skin: sanitizeHex(params.get('skin')) ?? base.skin,
    hair: sanitizeHex(params.get('hair')) ?? base.hair,
    topPrimary: sanitizeHex(params.get('top')) ?? base.topPrimary,
    topSecondary: sanitizeHex(params.get('sleeves')) ?? base.topSecondary,
    topAccent: sanitizeHex(params.get('accent')) ?? base.topAccent,
    pantsPrimary: sanitizeHex(params.get('pants')) ?? base.pantsPrimary,
    shoePrimary: sanitizeHex(params.get('shoes')) ?? base.shoePrimary,
    hatColor: sanitizeHex(params.get('hatColor')) ?? base.hatColor,
    topStyle:
      topStyleParam &&
      [
        'hoodie',
        'varsity',
        'tee',
        'corset',
        'bodysuit',
        'emma-corset',
        'hela-armor',
        'magneto-armor',
        'quicksilver-suit',
        'strange-tunic',
        'vision-suit',
        'agatha-gown',
        'invisible-suit',
      ].includes(topStyleParam)
        ? topStyleParam
        : base.topStyle,
    pantsStyle:
      pantsStyleParam &&
      ['joggers', 'shorts', 'jeans', 'tights'].includes(pantsStyleParam)
        ? pantsStyleParam
        : base.pantsStyle,
    hatStyle:
      hatStyleParam &&
      ['none', 'beanie', 'cap', 'tiara', 'magneto-helm'].includes(hatStyleParam)
        ? hatStyleParam
        : base.hatStyle,
    ...overrides,
  };
}
