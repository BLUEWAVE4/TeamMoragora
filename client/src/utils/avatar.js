// 아바타 커스터마이징 옵션 + 로컬 SVG 생성 (네트워크 요청 0)
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

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

// ===== 로컬 SVG 생성 (캐시) =====
const avatarCache = new Map();

function generateLocal(opts) {
  const key = JSON.stringify(opts);
  if (avatarCache.has(key)) return avatarCache.get(key);
  const avatar = createAvatar(avataaars, opts);
  const uri = avatar.toDataUri();
  avatarCache.set(key, uri);
  return uri;
}

// dicebear URL 파싱 → 로컬 옵션 변환
function parseDicebearUrl(url) {
  try {
    if (!url.includes('dicebear.com')) return null;
    const u = new URL(url);
    const p = u.searchParams;
    const opts = {};
    if (p.get('seed')) opts.seed = p.get('seed');
    if (p.get('top')) opts.top = [p.get('top')];
    if (p.get('topProbability')) opts.topProbability = parseInt(p.get('topProbability'));
    if (p.get('skinColor')) opts.skinColor = [p.get('skinColor')];
    if (p.get('hairColor')) opts.hairColor = [p.get('hairColor')];
    if (p.get('clothing')) opts.clothing = [p.get('clothing')];
    if (p.get('clothesColor')) opts.clothesColor = [p.get('clothesColor')];
    if (p.get('accessories')) opts.accessories = [p.get('accessories')];
    if (p.get('accessoriesColor')) opts.accessoriesColor = [p.get('accessoriesColor')];
    if (p.get('accessoriesProbability')) opts.accessoriesProbability = parseInt(p.get('accessoriesProbability'));
    if (p.get('facialHair')) opts.facialHair = [p.get('facialHair')];
    if (p.get('facialHairColor')) opts.facialHairColor = [p.get('facialHairColor')];
    if (p.get('facialHairProbability')) opts.facialHairProbability = parseInt(p.get('facialHairProbability'));
    if (p.get('eyes')) opts.eyes = [p.get('eyes')];
    if (p.get('eyebrows')) opts.eyebrows = [p.get('eyebrows')];
    if (p.get('mouth')) opts.mouth = [p.get('mouth')];
    return opts;
  } catch { return null; }
}

// userId+gender+옵션 → dicebear 라이브러리 옵션
function buildLocalOptions(userId, gender, customOptions = {}) {
  const isMale = gender === 'male';
  const styles = isMale ? MALE_STYLES : FEMALE_STYLES;
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const opts = { seed: userId };
  opts.top = [customOptions.top || styles[hash % styles.length]];
  if (customOptions.noHair) opts.topProbability = 0;
  opts.facialHairProbability = isMale ? 30 : 0;
  opts.accessoriesProbability = customOptions.accessories ? 100 : 20;

  if (customOptions.skinColor) opts.skinColor = [customOptions.skinColor];
  if (customOptions.hairColor) opts.hairColor = [customOptions.hairColor];
  if (customOptions.clothing) opts.clothing = [customOptions.clothing];
  if (customOptions.clothesColor) opts.clothesColor = [customOptions.clothesColor];
  if (customOptions.accessories) {
    opts.accessories = [customOptions.accessories];
    opts.accessoriesProbability = 100;
    if (customOptions.accessoriesColor) opts.accessoriesColor = [customOptions.accessoriesColor];
  }
  if (customOptions.eyes) opts.eyes = [customOptions.eyes];
  if (customOptions.eyebrows) opts.eyebrows = [customOptions.eyebrows];
  if (customOptions.mouth) opts.mouth = [customOptions.mouth];
  if (customOptions.facialHair && isMale) {
    opts.facialHair = [customOptions.facialHair];
    opts.facialHairProbability = 100;
    if (customOptions.facialHairColor) opts.facialHairColor = [customOptions.facialHairColor];
  } else if (!isMale) {
    opts.facialHairProbability = 0;
  }

  return opts;
}

// ===== 공개 API =====

// 자동 생성 아바타 (data URI, 즉시 렌더)
export function getAvatarUrl(userId, gender, customOptions) {
  if (!gender || !userId) return null;
  return generateLocal(buildLocalOptions(userId, gender, customOptions));
}

// 아바타 편집 프리뷰 (data URI, 즉시 렌더)
export function buildAvatarUrl(userId, gender, options = {}) {
  if (!userId) return null;
  return generateLocal(buildLocalOptions(userId, gender, options));
}

// DB 저장용 외부 URL (ProfilePage 저장 시에만 사용)
export function buildAvatarExternalUrl(userId, gender, options = {}) {
  if (!userId) return null;
  const isMale = gender === 'male';
  const params = new URLSearchParams({ seed: userId });

  if (!options.top) {
    const styles = isMale ? MALE_STYLES : FEMALE_STYLES;
    const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    params.set('top', styles[hash % styles.length]);
  }

  if (options.top) params.set('top', options.top);
  if (options.noHair) params.set('topProbability', '0');
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

// 아바타 URL 해석 래퍼 — 모든 dicebear URL을 로컬 생성으로 변환
export function resolveAvatar(avatarUrl, userId, gender) {
  if (avatarUrl) {
    // dicebear 외부 URL → 파싱 → 로컬 생성 (네트워크 0)
    const parsed = parseDicebearUrl(avatarUrl);
    if (parsed) return generateLocal(parsed);
    // 기타 외부 URL (커스텀 업로드 등) → 그대로
    return avatarUrl;
  }
  return getAvatarUrl(userId, gender) || DEFAULT_AVATAR_ICON;
}
