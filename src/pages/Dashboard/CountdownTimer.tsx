import React, {useState, useEffect, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../../helpers/config';

interface Props {
  expiresAt: string;
}

const CountdownTimer = ({expiresAt}: Props) => {
  const {t} = useTranslation('dashboard');
  const [remaining, setRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${minutes}m ${seconds}s`);
      setIsUrgent(minutes < 3);
    };

    update();
    timerRef.current = setInterval(update, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [expiresAt]);

  return (
    <View style={[styles.container, isUrgent && styles.urgent]}>
      <Text style={styles.icon}>⏱</Text>
      <Text style={[styles.text, isUrgent && styles.urgentText]}>
        {isExpired ? t('countdown.expired') : t('countdown.remaining', {remaining})}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  urgent: {
    backgroundColor: '#FFEBEE',
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.warning,
  },
  urgentText: {
    color: COLORS.danger,
  },
});

export default CountdownTimer;
