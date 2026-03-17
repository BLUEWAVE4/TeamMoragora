// 성별 기반 아바타 URL 생성
// gender가 없으면 null 반환 → 기본 아이콘 표시

export const MALE_STYLES = [
  'shortFlat', 'shortWaved', 'shortCurly',
  'dreads01', 'theCaesar', 'shortRound',
];

export const FEMALE_STYLES = [
  'straight01', 'straight02', 'curly',
  'bob', 'bun', 'curvy',
];

export const SKIN_COLORS = ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '614335'];
export const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'd6b370', 'e8e1e1'];
export const CLOTHING_OPTIONS = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'hoodie', 'overall', 'shirtCrewNeck', 'shirtVNeck'];
export const ACCESSORIES_OPTIONS = ['kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'];

export function getAvatarUrl(userId, gender, customOptions) {
  if (!gender || !userId) return null;

  const isMale = gender === 'male';
  const styles = isMale ? MALE_STYLES : FEMALE_STYLES;

  // 커스텀 옵션이 있으면 사용, 없으면 userId 기반 자동 선택
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
  if (customOptions?.accessories) params.set('accessories', customOptions.accessories);

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

// 커스텀 옵션으로 URL 생성 (프리뷰용)
export function buildAvatarUrl(userId, gender, options = {}) {
  if (!userId) return null;
  const isMale = gender === 'male';
  const params = new URLSearchParams({ seed: userId });

  if (options.top) params.set('top', options.top);
  if (options.skinColor) params.set('skinColor', options.skinColor);
  if (options.hairColor) params.set('hairColor', options.hairColor);
  if (options.clothing) params.set('clothing', options.clothing);
  if (options.accessories) {
    params.set('accessories', options.accessories);
    params.set('accessoriesProbability', '100');
  } else {
    params.set('accessoriesProbability', '0');
  }
  params.set('facialHairProbability', isMale ? '30' : '0');

  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

// 성별 없을 때 사용할 기본 아이콘 SVG (data URI)
export const DEFAULT_AVATAR_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#E8E8ED"/><circle cx="50" cy="38" r="16" fill="#C7C7CC"/><ellipse cx="50" cy="75" rx="26" ry="18" fill="#C7C7CC"/></svg>`)}`;
