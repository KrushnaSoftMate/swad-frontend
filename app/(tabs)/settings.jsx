// app/(tabs)/settings.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Alert, Platform, StyleSheet } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { COLORS } from '../../src/theme';
import { PrimaryButton } from '../../src/components';

export default function SettingsTab() {
  const { settings, saveSettings, seedData, customers, refresh } = useApp();
  const isDark = settings?.darkMode;
  const T = isDark ? COLORS.dark : COLORS.light;

  const [bizName,    setBizName]    = useState(settings?.bizName    || 'Swad Tiffins');
  const [fullRate,   setFullRate]   = useState(String(settings?.fullRate || 60));
  const [halfRate,   setHalfRate]   = useState(String(settings?.halfRate || 30));
  const [ownerPhone, setOwnerPhone] = useState(settings?.ownerPhone || '');
  const [saving,     setSaving]     = useState(false);
  const [seeding,    setSeeding]    = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ bizName: bizName.trim() || 'Swad Tiffins', fullRate: parseInt(fullRate)||60, halfRate: parseInt(halfRate)||30, ownerPhone: ownerPhone.trim(), darkMode: isDark });
      Alert.alert('✅ Saved', 'Settings saved to MongoDB!');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleSeed = async () => {
    Alert.alert('Seed Default Data', 'This will add 15 default customers (Dipak Sir, Pranav, etc.) to MongoDB.\n\nContinue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Seed!', onPress: async () => {
        setSeeding(true);
        try { await seedData(); Alert.alert('✅ Done', '15 customers added to MongoDB!'); }
        catch (e) { Alert.alert('Info', e.message); }
        finally { setSeeding(false); }
      }},
    ]);
  };

  const Inp = ({ value, onChangeText, ...props }) => (
    <TextInput
      style={{ backgroundColor: T.inputBg, borderWidth: 0.5, borderColor: T.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontWeight: '700', color: T.text, textAlign: 'right' }}
      value={value} onChangeText={onChangeText} placeholderTextColor={T.text3} {...props}
    />
  );

  const Row = ({ icon, iconBg, label, sub, right }) => (
    <View style={[s.row, { borderBottomColor: T.border }]}>
      <View style={[s.iconBox, { backgroundColor: iconBg }]}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>{label}</Text>
        {!!sub && <Text style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>{sub}</Text>}
      </View>
      {right}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>⚙️ Settings</Text>
        <Text style={s.headerSub}>Saved to MongoDB Atlas · {customers.length} customers</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* MongoDB status */}
        <View style={{ backgroundColor: COLORS.successLight, borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 26 }}>🍃</Text>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.successDark }}>MongoDB Connected ✅</Text>
            <Text style={{ fontSize: 11, color: COLORS.successDark }}>swad-server.onrender.com · {customers.length} customers</Text>
          </View>
        </View>

        <Text style={[s.groupLabel, { color: T.text2 }]}>BUSINESS</Text>
        <View style={[s.group, { backgroundColor: T.card, borderColor: T.border }]}>
          <Row icon="🏪" iconBg="#FFF0E8" label="Business Name" sub="Shown on reports"
            right={<Inp value={bizName} onChangeText={setBizName} placeholder="Swad Tiffins" style={{ width: 140 }} />} />
          <Row icon="📱" iconBg="#F3E8FF" label="Your Phone" sub="Owner WhatsApp"
            right={<Inp value={ownerPhone} onChangeText={setOwnerPhone} keyboardType="phone-pad" placeholder="91XXXXXXXXXX" style={{ width: 140 }} />} />
        </View>

        <Text style={[s.groupLabel, { color: T.text2 }]}>PRICING</Text>
        <View style={[s.group, { backgroundColor: T.card, borderColor: T.border }]}>
          <Row icon="🍱" iconBg="#D1FAE5" label="Full Tiffin Rate" sub="Default per tiffin"
            right={<View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Text style={{ color:T.text2 }}>₹</Text><Inp value={fullRate} onChangeText={setFullRate} keyboardType="numeric" style={{ width: 70 }} /></View>} />
          <Row icon="🥘" iconBg="#DBEAFE" label="Half Tiffin Rate" sub="Default per half"
            right={<View style={{ flexDirection:'row', alignItems:'center', gap:4 }}><Text style={{ color:T.text2 }}>₹</Text><Inp value={halfRate} onChangeText={setHalfRate} keyboardType="numeric" style={{ width: 70 }} /></View>} />
        </View>

        <Text style={[s.groupLabel, { color: T.text2 }]}>APPEARANCE</Text>
        <View style={[s.group, { backgroundColor: T.card, borderColor: T.border }]}>
          <Row icon="🌙" iconBg="#FEF9C3" label="Dark Mode" sub="Switch theme"
            right={<Switch value={isDark} onValueChange={v => saveSettings({ ...settings, darkMode: v })} trackColor={{ false: T.border, true: COLORS.primary }} thumbColor="white" />} />
        </View>

        <PrimaryButton title={saving ? 'Saving...' : '💾 Save Settings'} onPress={handleSave} loading={saving} style={{ marginTop: 16, marginBottom: 4 }} />

        <Text style={[s.groupLabel, { color: T.text2, marginTop: 16 }]}>DATABASE</Text>
        <View style={[s.group, { backgroundColor: T.card, borderColor: T.border }]}>
          <TouchableOpacity onPress={handleSeed}>
            <Row icon="🌱" iconBg="#D1FAE5" label="Seed Default Customers"
              sub="Add Dipak Sir, Pranav, Sudhanshu... (15 total)"
              right={seeding ? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>...</Text> : <Text style={{ color: T.text3, fontSize: 20 }}>›</Text>} />
          </TouchableOpacity>
          <TouchableOpacity onPress={refresh}>
            <Row icon="🔄" iconBg="#DBEAFE" label="Refresh Data" sub="Re-fetch from MongoDB"
              right={<Text style={{ color: T.text3, fontSize: 20 }}>›</Text>} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text style={{ fontSize: 32 }}>🍱</Text>
          <Text style={{ color: T.text2, fontSize: 13, fontWeight: '700', marginTop: 8 }}>Swad Tiffins Manager v2.0</Text>
          <Text style={{ color: T.text3, fontSize: 11, marginTop: 2 }}>Express + MongoDB Atlas + Expo</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 18, paddingBottom: 16 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  groupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  group: { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 0.5 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
