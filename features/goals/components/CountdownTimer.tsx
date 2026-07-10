import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

interface CountdownTimerProps {
  deadline: Date;
  accentColor: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  overdue: boolean;
}

function getTimeLeft(deadline: Date): TimeLeft {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, overdue: false };
}

export function CountdownTimer({ deadline, accentColor }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft.overdue) {
    return (
      <View>
        <Text style={{ color: '#E85D04', fontSize: 13, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5 }}>
          Deadline passed
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: accentColor, fontSize: 44, fontFamily: 'Inter-Bold', lineHeight: 48 }}>
          {timeLeft.days}
        </Text>
        <Text style={{ color: '#A79E8E', fontSize: 10, fontFamily: 'Inter-Medium', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          days
        </Text>
      </View>
      <View style={{ alignItems: 'center', paddingBottom: 4 }}>
        <Text style={{ color: '#8A8172', fontSize: 17, fontFamily: 'Inter-Medium' }}>{timeLeft.hours}h</Text>
        <Text style={{ color: '#A79E8E', fontSize: 10, fontFamily: 'Inter-Medium', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          hrs
        </Text>
      </View>
      <View style={{ alignItems: 'center', paddingBottom: 4 }}>
        <Text style={{ color: '#8A8172', fontSize: 17, fontFamily: 'Inter-Medium' }}>{timeLeft.minutes}m</Text>
        <Text style={{ color: '#A79E8E', fontSize: 10, fontFamily: 'Inter-Medium', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          min
        </Text>
      </View>
    </View>
  );
}
