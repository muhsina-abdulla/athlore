import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icon, ProgressBar, Txt } from '@/components/ui';
import {
  describeCriteria,
  describeProgress,
} from '@/features/goals/criteria';
import {
  milestoneProgress,
  type MilestoneItem,
} from '@/features/goals/queries';
import type { SessionFact } from '@/features/goals/criteria';
import { colors, opacity, radius, size, space } from '@/theme/tokens';

// Where each node sits across the width, repeating: left, centre, right, centre.
const LANES = [0.2, 0.5, 0.8, 0.5] as const;

type Props = {
  path: MilestoneItem[];
  facts: SessionFact[];
  categoryNames: Map<string, string>;
  onPress: (milestone: MilestoneItem) => void;
};

// A goal's milestones as a winding path, first step at the top. Done steps are filled
// green, the current step (the first one not done) is ringed, and later steps are muted.
export function GoalPath({ path, facts, categoryNames, onPress }: Props) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const currentIndex = path.findIndex((m) => !m.completedAt);
  const centre = (i: number) => ({
    x: LANES[i % LANES.length] * width,
    y: i * size.pathRow + size.pathRow / 2,
  });

  return (
    <View onLayout={onLayout} style={{ height: path.length * size.pathRow }}>
      {width > 0
        ? path.slice(1).map((m, i) => {
            // The segment between step i and step i + 1.
            const from = centre(i);
            const to = centre(i + 1);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            return (
              <View
                key={`line-${m.id}`}
                pointerEvents="none"
                style={[
                  styles.line,
                  {
                    left: (from.x + to.x) / 2 - size.pathLine / 2,
                    top: (from.y + to.y) / 2 - length / 2,
                    height: length,
                    transform: [{ rotate: `${-Math.atan2(dx, dy)}rad` }],
                  },
                  path[i].completedAt ? styles.lineDone : null,
                ]}
              />
            );
          })
        : null}

      {width > 0
        ? path.map((m, i) => {
            const c = centre(i);
            const done = !!m.completedAt;
            const current = i === currentIndex;
            const labelOnRight = c.x < width / 2 + 1;
            const progress = milestoneProgress(m, facts);
            const detail = done
              ? m.completedBy === 'auto'
                ? 'Completed automatically'
                : 'Completed'
              : m.kind === 'skill'
                ? 'Skill'
                : m.criteria && progress
                  ? describeProgress(m.criteria, progress)
                  : 'Measurable';
            const target =
              m.kind === 'measurable' && m.criteria && !done
                ? describeCriteria(m.criteria, m.criteria.categoryId ? categoryNames.get(m.criteria.categoryId) ?? null : null)
                : null;

            const labelStyle = labelOnRight
              ? { left: c.x + size.milestoneNode / 2 + space.md, right: 0 }
              : { right: width - c.x + size.milestoneNode / 2 + space.md, left: 0 };

            return (
              <Pressable
                key={m.id}
                onPress={() => onPress(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m.title}. ${detail}`}
                style={({ pressed }) => [
                  styles.stop,
                  { top: i * size.pathRow, height: size.pathRow },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.node,
                    { left: c.x - size.milestoneNode / 2 },
                    done && styles.nodeDone,
                    current && styles.nodeCurrent,
                  ]}
                >
                  <Icon
                    name={done ? 'check' : m.kind === 'skill' ? 'military-tech' : 'show-chart'}
                    size={size.iconLg}
                    color={done ? 'onAccent' : current ? 'accent' : 'textTertiary'}
                  />
                </View>
                <View style={[styles.label, labelStyle]}>
                  <Txt
                    variant="label"
                    color={done || current ? 'text' : 'textSecondary'}
                    numberOfLines={2}
                    style={labelOnRight ? undefined : styles.alignEnd}
                  >
                    {m.title}
                  </Txt>
                  <Txt
                    variant="caption"
                    color={done ? 'accent' : 'textSecondary'}
                    numberOfLines={2}
                    style={labelOnRight ? undefined : styles.alignEnd}
                  >
                    {detail}
                  </Txt>
                  {current && progress ? (
                    <View style={styles.bar}>
                      <ProgressBar value={progress.fraction} />
                    </View>
                  ) : null}
                  {target && !current ? (
                    <Txt
                      variant="micro"
                      color="textTertiary"
                      style={labelOnRight ? undefined : styles.alignEnd}
                    >
                      {target}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    position: 'absolute',
    width: size.pathLine,
    borderRadius: radius.full,
    backgroundColor: colors.divider,
  },
  lineDone: { backgroundColor: colors.accent },
  stop: { position: 'absolute', left: 0, right: 0 },
  pressed: { opacity: opacity.pressed },
  node: {
    position: 'absolute',
    top: (size.pathRow - size.milestoneNode) / 2,
    width: size.milestoneNode,
    height: size.milestoneNode,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inset,
    borderWidth: size.nodeBorder,
    borderColor: colors.divider,
  },
  nodeDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  nodeCurrent: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  label: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: space.xxs,
  },
  alignEnd: { textAlign: 'right' },
  bar: { paddingTop: space.xs },
});
