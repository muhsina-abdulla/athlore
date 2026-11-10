import Svg, { Polyline } from 'react-native-svg';

import { colors, radius, size } from '@/theme/tokens';

// Points of the mountain line, as fractions of the tile (0 to 1).
const MOUNTAIN = '0.29,0.65 0.43,0.41 0.5,0.52 0.6,0.37 0.7,0.65';

// The Athlore mark: a mint mountain line on a rounded dark tile, as in the design.
export function BrandMark({ dimension = size.brandMark }: { dimension?: number }) {
  return (
    <Svg
      width={dimension}
      height={dimension}
      viewBox="0 0 1 1"
      accessibilityLabel="Athlore logo"
      style={{ borderRadius: radius.xl, backgroundColor: colors.card }}
    >
      <Polyline
        points={MOUNTAIN}
        fill="none"
        stroke={colors.accent}
        strokeWidth={0.03}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
