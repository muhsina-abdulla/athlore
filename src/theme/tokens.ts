// Athlore Minimal design tokens. Every color, spacing, radius and type value
// used by screens comes from here. Add a named token before using a new value.

export const colors = {
  bg: '#14161A',
  card: '#1C1F25',
  cardPressed: '#23272E',
  inset: '#101216',
  divider: '#2A2E35',

  text: '#F2F4F7',
  textSecondary: '#9AA1AC',
  textTertiary: '#6B717C',

  accent: '#6FCF97',
  onAccent: '#0F1A14',
  accentSoft: 'rgba(111, 207, 151, 0.14)',
  accentBorder: 'rgba(111, 207, 151, 0.40)',

  danger: '#E5736A',
  dangerSoft: 'rgba(229, 115, 106, 0.14)',
  dangerBorder: 'rgba(229, 115, 106, 0.40)',

  scrim: 'rgba(0, 0, 0, 0.60)',
} as const;

export type ColorName = keyof typeof colors;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 20,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const size = {
  button: 52,
  chip: 36,
  touch: 44,
  avatar: 36,
  icon: 22,
  iconLg: 24,
  iconSm: 18,
  iconXl: 32,
  emptyTile: 72,
  star: 28,
  starInput: 40,
  dialogMax: 360,
  progress: 6,
  tabBar: 64,
  logButton: 56,
  logButtonLift: 16,
  sheetHandle: 4,
  sheetHandleWidth: 36,
  input: 52,
  dot: 10,
  weekDay: 36,
  moodCircle: 44,
  inputMulti: 96,
} as const;

export const opacity = {
  pressed: 0.8,
  disabled: 0.4,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  section: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  stat: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;

export type TypeVariant = keyof typeof type;
