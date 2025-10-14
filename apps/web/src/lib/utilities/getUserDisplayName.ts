export const getUserDisplayName = (user: {
  name_first: string;
  name_last: string;
  name_full: string;
  cid: number;
  preferences?: { key: string; value: string }[];
}): string => {
  const namePreference = user.preferences?.find((p) => p.key === 'displayName')?.value || 'full';

  switch (namePreference) {
    case 'full':
      return user.name_full;
    case 'initial':
      return `${user.name_first} ${user.name_last[0].toUpperCase()}`;
    case 'cid':
      return user.cid.toString();
    default:
      return user.name_full;
  }
};
