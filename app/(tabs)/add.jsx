// app/(tabs)/add.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/theme';
import { FormInput, PrimaryButton } from '../../src/components';

const TYPES = ['Full Tiffin', 'Half Tiffin', 'Daily', 'Custom'];

export default function AddTab() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { addCustomer, settings } = useApp();
  const T        = settings?.darkMode ? COLORS.dark : COLORS.light;

  const [name,    setName]    = useState('');
  const [type,    setType]    = useState('Full Tiffin');
  const [rate,    setRate]    = useState(String(settings?.fullRate || 60));
  const [phone,   setPhone]   = useState('');
  const [floor,   setFloor]   = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter customer name'); return; }
    setLoading(true);
    try {
      await addCustomer({
        name: name.trim(), type,
        rate: parseInt(rate) || 60,
        phone: phone.trim(), floor: floor.trim(),
        note: note.trim(), rawStr: '', paidExtra: 0,
      });
      Alert.alert('✅ Added!', `${name} added to MongoDB!`, [
        { text: 'OK', onPress: () => { setName(''); setPhone(''); setFloor(''); setNote(''); router.push('/'); } }
      ]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.title}>➕ Add Customer</Text>
        <Text style={s.sub}>Saved directly to MongoDB</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={[s.iconBox, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={{ fontSize: 52, textAlign: 'center' }}>🍱</Text>
          <Text style={{ fontSize: 14, color: T.text2, textAlign: 'center', marginTop: 8, fontWeight: '600' }}>New Tiffin Customer</Text>
        </View>

        <FormInput label="Full Name *" value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" theme={T} />

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tiffin Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(t => (
              <TouchableOpacity key={t}
                onPress={() => { setType(t); setRate(t.includes('Half') ? String(settings?.halfRate || 30) : String(settings?.fullRate || 60)); }}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 0.5, backgroundColor: type === t ? COLORS.primary : T.inputBg, borderColor: type === t ? COLORS.primary : T.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: type === t ? 'white' : T.text2 }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormInput label="Rate per Tiffin (₹)" value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="60" theme={T} />
        <FormInput label="Phone (for WhatsApp)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" theme={T} />
        <FormInput label="Floor / Location" value={floor} onChangeText={setFloor} placeholder="e.g. 5th Floor" theme={T} />
        <FormInput label="Notes (optional)" value={note} onChangeText={setNote} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} theme={T} />

        <PrimaryButton title={loading ? 'Saving to MongoDB...' : '➕ Add Customer'} onPress={handleAdd} loading={loading} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: 'white', fontSize: 20, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  iconBox: { borderRadius: 20, borderWidth: 0.5, padding: 24, marginBottom: 20, alignItems: 'center' },
});
