// 성별 기반 아바타 URL 생성
// gender가 없으면 null 반환 → 기본 아이콘 표시

const MALE_STYLES = [
  'shortFlat', 'shortWaved', 'shortCurly',
  'dreads01', 'theCaesar', 'shortRound',
];

const FEMALE_STYLES = [
  'straight01', 'straight02', 'curly',
  'bob', 'bun', 'curvy',
];

export function getAvatarUrl(userId, gender) {
  if (!gender || !userId) return null;

  const isMale = gender === 'male';
  const styles = isMale ? MALE_STYLES : FEMALE_STYLES;

  // userId 기반으로 일관된 스타일 선택
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const topStyle = styles[hash % styles.length];

  const params = new URLSearchParams({
    seed: userId,
    top: topStyle,
    facialHairProbability: isMale ? '30' : '0',
    accessoriesProbability: '20',
  });

  return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
}

// 성별 없을 때 사용할 기본 아이콘 SVG (data URI)
export const DEFAULT_AVATAR_ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#E8E8ED"/><circle cx="50" cy="38" r="16" fill="#C7C7CC"/><ellipse cx="50" cy="75" rx="26" ry="18" fill="#C7C7CC"/></svg>`)}`;
