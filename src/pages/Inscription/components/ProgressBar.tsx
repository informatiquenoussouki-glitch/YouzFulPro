import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../../../helpers/config';

type Props = {current: number; total: number};

const ProgressBar = ({current, total}: Props) => {
  const {t} = useTranslation();
  const pct = (current / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${pct}%`}]} />
      </View>
      <Text style={styles.label}>
        {t('inscription.etape', {current, total})}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: COLORS.background,
  },
  track: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
});

export default ProgressBar;
