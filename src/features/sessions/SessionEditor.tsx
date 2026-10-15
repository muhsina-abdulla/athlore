import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DatePickerSheet } from '@/components/DatePickerSheet';
import { DetailSection } from '@/components/DetailSection';
import { TextField } from '@/components/TextField';
import { Card, Chip, Icon, Stars, Txt } from '@/components/ui';
import { DEFAULT_CATEGORIES, DEFAULT_SESSION_TYPES } from '@/db/defaults';
import {
  DETAIL_SECTIONS,
  sectionPreview,
  type DetailKey,
  type DetailSection as DetailSectionDef,
  type TextDetailKey,
} from '@/features/sessions/detailSections';
import { ExercisesEditor } from '@/features/sessions/ExercisesEditor';
import {
  DURATION_PRESETS,
  formatDuration,
  formatMinutesTotal,
  type SessionForm,
} from '@/features/sessions/formState';
import { MoodPicker } from '@/features/sessions/MoodPicker';
import { OtherOptionsSheet } from '@/features/sessions/OtherOptionsSheet';
import { useCategories, useSessionTypes } from '@/features/sessions/queries';
import {
  createCategory,
  createSessionType,
  deleteCategory,
  deleteSessionType,
} from '@/features/sessions/repo';
import { formatDateRow } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

type SessionEditorProps = {
  form: SessionForm;
  onChange: (patch: Partial<SessionForm>) => void;
  // Which optional section is open. Controlled by the screen so it can show the
  // "Next / Done" bar above the keyboard.
  openSection: DetailKey | null;
  onOpenSection: (key: DetailKey | null) => void;
};

// The log form. Only date and category are required; everything else is optional,
// and the detail sections stay closed so quick logging stays quick.
export function SessionEditor({ form, onChange, openSection, onOpenSection }: SessionEditorProps) {
  const categories = useCategories();
  const sessionTypes = useSessionTypes();

  const [pickingDate, setPickingDate] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [typeSheet, setTypeSheet] = useState(false);
  const [otherDuration, setOtherDuration] = useState(false);

  // Defaults are always chips. Anything else (the athlete's own entries) lives in
  // the "Other" sheet, and shows as a chip only while selected.
  const defaultCategoryIds = new Set<string>(DEFAULT_CATEGORIES.map((c) => c.id));
  const defaultTypeIds = new Set<string>(DEFAULT_SESSION_TYPES.map((t) => t.id));
  const categoryChips = categories.filter(
    (c) => defaultCategoryIds.has(c.id) || c.id === form.categoryId,
  );
  const typeChips = sessionTypes.filter(
    (t) => defaultTypeIds.has(t.id) || form.sessionTypeIds.includes(t.id),
  );
  const otherCategories = categories.filter((c) => !defaultCategoryIds.has(c.id));
  const otherTypes = sessionTypes.filter((t) => !defaultTypeIds.has(t.id));

  // A removed category or type must not stay selected in a draft that predates it.
  const categoryGone =
    form.categoryId !== null &&
    categories.length > 0 &&
    !categories.some((c) => c.id === form.categoryId);
  const goneTypeIds =
    sessionTypes.length > 0
      ? form.sessionTypeIds.filter((id) => !sessionTypes.some((t) => t.id === id))
      : [];
  useEffect(() => {
    if (categoryGone) onChange({ categoryId: null });
    if (goneTypeIds.length > 0) {
      onChange({ sessionTypeIds: form.sessionTypeIds.filter((id) => !goneTypeIds.includes(id)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryGone, goneTypeIds.length]);

  const presetSelected = DURATION_PRESETS.some((p) => p.minutes === form.durationMinutes);
  const showOtherInput = otherDuration || (form.durationMinutes !== null && !presetSelected);

  const addCategory = async (name: string) => {
    const id = await createCategory(name);
    onChange({ categoryId: id });
    setCategorySheet(false);
  };

  const addSessionType = async (name: string) => {
    const id = await createSessionType(name);
    if (!form.sessionTypeIds.includes(id)) onChange({ sessionTypeIds: [...form.sessionTypeIds, id] });
  };

  const toggleType = (id: string) => {
    const has = form.sessionTypeIds.includes(id);
    onChange({
      sessionTypeIds: has
        ? form.sessionTypeIds.filter((t) => t !== id)
        : [...form.sessionTypeIds, id],
    });
  };

  const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
  const typeNames = sessionTypes
    .filter((t) => form.sessionTypeIds.includes(t.id))
    .map((t) => t.name);

  const detailsOpen = openSection !== null;

  const textSection = (key: TextDetailKey, placeholder: string) => (
    <TextField
      value={form[key]}
      onChangeText={(value) => onChange({ [key]: value })}
      placeholder={placeholder}
      multiline
      autoFocus
    />
  );

  const sectionBody = (section: DetailSectionDef) => {
    if (section.key === 'exercises') {
      return (
        <ExercisesEditor
          exercises={form.exercises}
          onChange={(exercises) => onChange({ exercises })}
        />
      );
    }
    if (section.key === 'ratingMood') {
      return (
        <>
          <View style={styles.well}>
            <Txt variant="caption" color="textSecondary">
              Session rating
            </Txt>
            <Stars
              value={form.rating}
              starSize={size.starInput}
              onChange={(rating) => onChange({ rating })}
            />
            {form.rating !== null ? (
              <Txt variant="caption" color="textSecondary">
                {`${form.rating} out of 10`}
              </Txt>
            ) : null}
          </View>
          <View style={styles.well}>
            <Txt variant="caption" color="textSecondary">
              Post-training mood
            </Txt>
            <View style={styles.stretch}>
              <MoodPicker
                value={form.moodScale}
                onChange={(moodScale) => onChange({ moodScale })}
              />
            </View>
          </View>
        </>
      );
    }
    return textSection(section.key, section.placeholder ?? '');
  };

  return (
    <View style={styles.root}>
      {detailsOpen ? (
        // While a detail section is open the main card folds into one line, so
        // the section being written gets the room.
        <Pressable
          onPress={() => onOpenSection(null)}
          accessibilityRole="button"
          accessibilityLabel="Show session basics"
          style={styles.summary}
        >
          <Txt variant="label" numberOfLines={1} style={styles.summaryMain}>
            {[categoryName, formatDuration(form.durationMinutes) || null]
              .filter(Boolean)
              .join(' · ') || 'Session'}
            {typeNames.length > 0 ? (
              <Txt variant="caption" color="textSecondary">
                {`  •  ${typeNames.join(', ')}`}
              </Txt>
            ) : null}
          </Txt>
          <Txt variant="caption" color="textSecondary">
            {formatDateRow(form.trainingDate, 'short')}
          </Txt>
        </Pressable>
      ) : (
        <Card bordered style={styles.main}>
          <Pressable
            onPress={() => setPickingDate(true)}
            accessibilityRole="button"
            accessibilityLabel={`Training date: ${formatDateRow(form.trainingDate)}. Change`}
            style={styles.dateRow}
          >
            <Icon name="event" size={size.iconLg} color="textSecondary" />
            <Txt variant="label" style={styles.flex}>
              {formatDateRow(form.trainingDate)}
            </Txt>
            <Icon name="expand-more" size={size.iconLg} />
          </Pressable>
          <View style={styles.divider} />

          <View style={styles.group}>
            <Txt variant="caption" color="textSecondary">
              Category
            </Txt>
            <View style={styles.chips}>
              {categoryChips.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={form.categoryId === c.id}
                  onPress={() => onChange({ categoryId: c.id })}
                />
              ))}
              <Chip label="Other" onPress={() => setCategorySheet(true)} />
            </View>
          </View>

          <TextField
            label="Training focus"
            value={form.trainingFocus}
            onChangeText={(trainingFocus) => onChange({ trainingFocus })}
            placeholder="eg: Striking form correction"
            returnKeyType="next"
            onSubmitEditing={() => onOpenSection('techniques')}
          />

          <View style={styles.group}>
            <View style={styles.labelRow}>
              <Txt variant="caption" color="textSecondary">
                Duration
              </Txt>
              <Txt variant="caption" color="textSecondary">
                {formatMinutesTotal(form.durationMinutes)}
              </Txt>
            </View>
            <View style={styles.chips}>
              {DURATION_PRESETS.map((p) => (
                <Chip
                  key={p.minutes}
                  label={p.label}
                  selected={form.durationMinutes === p.minutes}
                  onPress={() => {
                    setOtherDuration(false);
                    onChange({
                      durationMinutes: form.durationMinutes === p.minutes ? null : p.minutes,
                    });
                  }}
                />
              ))}
              <Chip
                label="Other"
                selected={showOtherInput}
                onPress={() => {
                  setOtherDuration(true);
                  if (presetSelected) onChange({ durationMinutes: null });
                }}
              />
            </View>
            {showOtherInput ? (
              <TextField
                value={form.durationMinutes === null ? '' : String(form.durationMinutes)}
                onChangeText={(text) => {
                  const minutes = parseInt(text.replace(/[^0-9]/g, ''), 10);
                  onChange({ durationMinutes: Number.isNaN(minutes) ? null : minutes });
                }}
                placeholder="Minutes"
                keyboardType="number-pad"
              />
            ) : null}
          </View>

          <View style={styles.group}>
            <View style={styles.labelRow}>
              <Txt variant="caption" color="textSecondary">
                Session type
              </Txt>
              <Txt variant="caption" color="textSecondary">
                Multi-select
              </Txt>
            </View>
            <View style={styles.chips}>
              {typeChips.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  check
                  selected={form.sessionTypeIds.includes(t.id)}
                  onPress={() => toggleType(t.id)}
                />
              ))}
              <Chip label="Other" onPress={() => setTypeSheet(true)} />
            </View>
          </View>
        </Card>
      )}

      <View style={styles.details}>
        <View style={styles.labelRow}>
          <Txt variant="label" color="textSecondary">
            Add details (optional)
          </Txt>
          <Txt variant="caption" color="textSecondary">
            {`${DETAIL_SECTIONS.length} items`}
          </Txt>
        </View>
        {DETAIL_SECTIONS.map((section) => (
          <DetailSection
            key={section.key}
            title={section.title}
            hint={section.hint}
            tone={section.tone}
            preview={sectionPreview(form, section.key)}
            open={openSection === section.key}
            compact={detailsOpen && openSection !== section.key}
            onToggle={() => onOpenSection(openSection === section.key ? null : section.key)}
          >
            {sectionBody(section)}
          </DetailSection>
        ))}
      </View>

      <DatePickerSheet
        visible={pickingDate}
        value={form.trainingDate}
        onClose={() => setPickingDate(false)}
        onPick={(trainingDate) => onChange({ trainingDate })}
      />
      <OtherOptionsSheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        title="Other categories"
        noun="category"
        items={otherCategories}
        selectedIds={form.categoryId ? [form.categoryId] : []}
        multi={false}
        onSelect={(id) => {
          onChange({ categoryId: id });
          setCategorySheet(false);
        }}
        onAdd={addCategory}
        onRemove={deleteCategory}
      />
      <OtherOptionsSheet
        visible={typeSheet}
        onClose={() => setTypeSheet(false)}
        title="Other session types"
        noun="session type"
        items={otherTypes}
        selectedIds={form.sessionTypeIds}
        multi
        onSelect={toggleType}
        onAdd={addSessionType}
        onRemove={deleteSessionType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { gap: space.xxl },
  main: { gap: space.xl },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.touch,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
  group: { gap: space.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: size.touch,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  summaryMain: { flex: 1 },
  details: { gap: space.md },
  stretch: { alignSelf: 'stretch' },
  well: {
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.inset,
  },
});
