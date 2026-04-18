// app/customer/edit/[id].jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../../src/context/AppContext';
import { COLORS } from '../../../src/theme';
import { FormInput, PrimaryButton } from '../../../src/components';

const TYPES = ['Full Tiffin', 'Half Tiffin', 'Daily', 'Custom'];

export default function EditCustomerScreen() {
  const { id }   = useLocalSearchParams();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { customers, settings, updateCustomer } = useApp();
  const T        = settings?.darkMode ? COLORS.dark : COLORS.light;
  const c        = customers.find(x => x._id === id);

  const [name,      setName]      = useState(c?.name      || '');
  const [type,      setType]      = useState(c?.type      || 'Full Tiffin');
  const [rate,      setRate]      = useState(String(c?.rate      || 60));
  const [phone,     setPhone]     = useState(c?.phone     || '');
  const [floor,     setFloor]     = useState(c?.floor     || '');
  const [note,      setNote]      = useState(c?.note      || '');
  const [rawStr,    setRawStr]    = useState(c?.rawStr    || '');
  const [paidExtra, setPaidExtra] = useState(String(c?.paidExtra || 0));
  const [saving,    setSaving]    = useState(false);

  if (!c) return null;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      await updateCustomer(c._id, {
        name: name.trim(), type,
        rate: parseInt(rate) || 60,
        phone: phone.trim(), floor: floor.trim(),
        note: note.trim(), rawStr: rawStr.trim(),
        paidExtra: parseInt(paidExtra) || 0,
      });
      Alert.alert('✅ Updated!', `${name} saved to MongoDB!`);
      router.back();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: 'white', fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Customer</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <FormInput label="Full Name" value={name} onChangeText={setName} theme={T} />

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: T.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Tiffin Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setType(t)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 0.5, backgroundColor: type === t ? COLORS.primary : T.inputBg, borderColor: type === t ? COLORS.primary : T.border }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: type === t ? 'white' : T.text2 }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormInput label="Rate (₹)" value={rate} onChangeText={setRate} keyboardType="numeric" theme={T} />
        <FormInput label="Phone (WhatsApp)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" theme={T} />
        <FormInput label="Floor / Location" value={floor} onChangeText={setFloor} theme={T} />
        <FormInput label="Extra Paid (₹)" value={paidExtra} onChangeText={setPaidExtra} keyboardType="numeric" theme={T} />
        <FormInput label="Notes" value={note} onChangeText={setNote} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} theme={T} />
        <FormInput label='Dates (e.g. "10 paid, 11, 12 paid")' value={rawStr} onChangeText={setRawStr} multiline numberOfLines={4} style={{ minHeight: 80, textAlignVertical: 'top', fontSize: 12 }} theme={T} />
        <Text style={{ fontSize: 11, color: T.text3, marginBottom: 16, lineHeight: 17 }}>
          💡 Comma-separated. Write "paid" after date to mark paid. E.g: "10 paid, 11, 12 paid, 13"
        </Text>

        <PrimaryButton title={saving ? 'Saving...' : '💾 Save Changes'} onPress={handleSave} loading={saving} />
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 14, alignItems: 'center', marginTop: 6 }}>
          <Text style={{ color: T.text2, fontWeight: '700' }}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: 'white', fontSize: 17, fontWeight: '800' },
});
