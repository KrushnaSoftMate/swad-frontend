// src/components/index.js
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { COLORS, AVATARS } from '../theme';

export function Avatar({ name = '', size = 44, index = 0 }) {
  const av = AVATARS[Math.abs(index) % AVATARS.length];
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: av.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: av.color, fontWeight: '900', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
}

export function Badge({ status }) {
  const map = {
    paid:    { bg: COLORS.successLight, color: COLORS.successDark, label: '✓ Paid' },
    partial: { bg: COLORS.warningLight, color: COLORS.warningDark, label: 'Partial' },
    due:     { bg: COLORS.dangerLight,  color: COLORS.dangerDark,  label: 'Due' },
  };
  const s = map[status] || map.due;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: s.color, fontSize: 10, fontWeight: '800' }}>{s.label}</Text>
    </View>
  );
}

export function DayChip({ date, paid }) {
  return (
    <View style={{ backgroundColor: paid ? COLORS.successLight : COLORS.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, margin: 2 }}>
      <Text style={{ color: paid ? COLORS.successDark : COLORS.primary, fontSize: 10, fontWeight: '800' }}>
        {date}{paid ? '✓' : ''}
      </Text>
    </View>
  );
}

export function FormInput({ label, theme, style, ...props }) {
  const T = theme || COLORS.light;
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={{ fontSize: 11, fontWeight: '700', color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{label}</Text>}
      <TextInput
        style={[{ backgroundColor: T.inputBg, borderWidth: 0.5, borderColor: T.border, borderRadius: 12, padding: 12, fontSize: 14, color: T.text }, style]}
        placeholderTextColor={T.text3}
        {...props}
      />
    </View>
  );
}

export function PrimaryButton({ title, onPress, color, style, loading: isLoading }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={isLoading}
      style={[{ backgroundColor: color || COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center' }, style]}>
      {isLoading
        ? <ActivityIndicator color="white" />
        : <Text style={{ color: 'white', fontSize: 15, fontWeight: '800' }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function DetailItem({ label, value, valueColor, theme }) {
  const T = theme || COLORS.light;
  return (
    <View style={{ backgroundColor: T.inputBg, borderRadius: 12, padding: 10, flex: 1, margin: 3 }}>
      <Text style={{ fontSize: 10, color: T.text2, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: valueColor || T.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export function LoadingScreen({ theme }) {
  const T = theme || COLORS.light;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <Text style={{ fontSize: 56, marginBottom: 20 }}>🍱</Text>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '700', color: T.text2 }}>Loading Swad Tiffins...</Text>
      <Text style={{ marginTop: 6, fontSize: 12, color: T.text3 }}>Connecting to MongoDB...</Text>
    </View>
  );
}

export function ErrorScreen({ message, onRetry, theme, onSeed }) {
  const T = theme || COLORS.light;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg, padding: 32 }}>
      <Text style={{ fontSize: 56, marginBottom: 16 }}>🔌</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 8, textAlign: 'center' }}>Cannot Connect</Text>
      <Text style={{ fontSize: 13, color: T.text2, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
        {message}
      </Text>
      <TouchableOpacity onPress={onRetry}
        style={{ backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>🔄 Retry</Text>
      </TouchableOpacity>
      {onSeed && (
        <TouchableOpacity onPress={onSeed}
          style={{ backgroundColor: COLORS.successLight, borderRadius: 14, padding: 14, width: '100%', alignItems: 'center' }}>
          <Text style={{ color: COLORS.successDark, fontWeight: '800', fontSize: 15 }}>🌱 Seed Default Data</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ icon, text }) {
  return (
    <View style={{ alignItems: 'center', padding: 48 }}>
      <Text style={{ fontSize: 52, marginBottom: 14 }}>{icon}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#999', textAlign: 'center' }}>{text}</Text>
    </View>
  );
}
