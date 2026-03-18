// 아바타 커스터마이징 옵션 + URL 생성

export const MALE_STYLES = [
  'shortFlat', 'shortWaved', 'shortCurly', 'dreads01', 'theCaesar', 'shortRound',
  'dreads02', 'frizzle', 'shaggyMullet', 'sides',
];

export const FEMALE_STYLES = [
  'straight01', 'straight02', 'curly', 'bob', 'bun', 'curvy',
  'dreads01', 'frida', 'fro', 'froAndBand', 'miaWallace', 'bigHair',
];

export const SKIN_COLORS = ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '614335'];
export const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1'];
export const CLOTHING_OPTIONS = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtVNeck'];
export const CLOTHES_COLORS = ['3c4f5c', '65c9ff', '5199e4', '25557c', 'e6e6e6', '929598', 'a7ffc4', 'ff5c5c', 'ffafb9', 'ffdeb5', 'ff488e', '262e33'];
export const ACCESSORIES_OPTIONS = ['kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'];
export const ACCESSORIES_COLORS = ['000000', '65c9ff', 'e6e6e6', 'ff488e', 'ffdeb5', 'a7ffc4'];
export const EYES_OPTIONS = ['default', 'happy', 'closed', 'squint', 'surprised', 'wink', 'winkWacky', 'xDizzy', 'eyeRoll', 'hearts', 'side', 'cry'];
export const EYEBROWS_OPTIONS = ['default', 'defaultNatural', 'flatNatural', 'raisedExcited', 'raisedExcitedNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural', 'upDown', 'upDownNatural', 'angryNatural', 'angry'];
export const MOUTH_OPTIONS = ['default', 'smile', 'twinkle', 'tongue', 'serious', 'screamOpen', 'sad', 'disbelief', 'eating', 'grimace', 'concerned', 'vomit'];
export const FACIAL_HAIR_OPTIONS = ['beardLight', 'beardMajestic', 'beardMedium', 'moustacheFancy', 'moustacheMagnum'];
export const FACIAL_HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370'];

export function getAvatarUrl(userId, gender, customOptions) {
  if (!gender || !userId) return null;

  const isMale = gender === 'male';
  const styles = isMale ? MALE_STYLES : FEMALE_STYLES;
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const topStyle = customOptions?.top || styles[hash % styles.length];

  const params = new URLSearchParams({
    seed: userId,
    top: topStyle,
    facialHairProbability: isMale ? '30' : '0',
    accessoriesProbability: customOptions?.accessories ? '100' : '20',
  });

  if (customOptions?.skinColor) params.set('skinColor', customOptions.skinColor);
  if (customOptions?.hairColor) params.set('hairColor', customOptions.hairColor);
  if (customOptions?.clothing) params.set('clothing', customOptions.clothing);
  if (customOptions?.clothesColor) params.set('clothesColor', customOptions.clothesColor);
  if (customOptions?.accessories) params.set('accessories', customOptions.accessories);
  if (customOptions?.accessoriesColor) params.set('accessoriesColor', customOptions.accessoriesColor);
  if (customOptions?.eyes) params.set('eyes', customOptions.eyes);
  if (customOptions?.eyebrows) params.set('eyebrows', customOptions.eyebrows);
  if (customOptions?.mouth) params.set('mouth', customOptions.mouth);
  if (customOptions?.facialHair) {
    params.set('facialHair', customOptions.facialHair);
    params.set('facialHairProbability', '100');
    if (customOptions.facialHairColor) params.set('facialHairColor', customOptions.facialHairColor);
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export function buildAvatarUrl(userId, gender, options = {}) {
  if (!userId) return null;
  const isMale = gender === 'male';
  const params = new URLSearchParams({ seed: userId });

  if (options.top) params.set('top', options.top);
  if (options.skinColor) params.set('skinColor', options.skinColor);
  if (options.hairColor) params.set('hairColor', options.hairColor);
  if (options.clothing) params.set('clothing', options.clothing);
  if (options.clothesColor) params.set('clothesColor', options.clothesColor);
  if (options.eyes) params.set('eyes', options.eyes);
  if (options.eyebrows) params.set('eyebrows', options.eyebrows);
  if (options.mouth) params.set('mouth', options.mouth);
  if (options.accessories) {
    params.set('accessories', options.accessories);
    params.set('accessoriesProbability', '100');
    if (options.accessoriesColor) params.set('accessoriesColor', options.accessoriesColor);
  } else {
    params.set('accessoriesProbability', '0');
  }
  if (options.facialHair && isMale) {
    params.set('facialHair', options.facialHair);
    params.set('facialHairProbability', '100');
    if (options.facialHairColor) params.set('facialHairColor', options.facialHairColor);
  } else {
    params.set('facialHairProbability', '0');
  }

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export const DEFAULT_AVATAR_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#E8E8ED"/><circle cx="50" cy="38" r="16" fill="#C7C7CC"/><ellipse cx="50" cy="75" rx="26" ry="18" fill="#C7C7CC"/></svg>`)}`;
