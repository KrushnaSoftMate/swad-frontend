// app/(tabs)/whatsapp.jsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { Avatar, EmptyState } from '../../src/components';

export default function WhatsAppTab() {
  const insets = useSafeAreaInsets();
  const { customers, settings } = useApp();
  const T = settings?.darkMode ? COLORS.dark : COLORS.light;
  const dueList = customers.filter(c => calcCustomer(c).dueAmt > 0);

  const buildMsg = (c) => {
    const cl = calcCustomer(c);
    return `नमस्ते ${c.name} जी! 🙏\n\n*${settings?.bizName || 'Swad Tiffins'}* से payment reminder:\n\n📅 तिफ़िन: *${cl.total}* | ₹${cl.totalAmt}\n✅ जमा: *₹${cl.paidAmt}*\n⏳ बकाया: *₹${cl.dueAmt}*\n\nकृपया जल्द भुगतान करें। धन्यवाद! 🍱`;
  };

  const openWA = (c) => {
    const msg = buildMsg(c);
    const url = c.phone
      ? `whatsapp://send?phone=91${c.phone}&text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp not installed'));
  };

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.title}>💬 WhatsApp Reminders</Text>
        <Text style={s.sub}>{dueList.length} customers with pending dues</Text>
      </View>
      <FlatList
        data={dueList}
        keyExtractor={c => c._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={dueList.length > 0 ? (
          <TouchableOpacity style={s.sendAllBtn} onPress={() => openWA(dueList[0])}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>
              📤 Send Reminders ({dueList.length} due customers)
            </Text>
          </TouchableOpacity>
        ) : null}
        ListEmptyComponent={<EmptyState icon="🎉" text="All customers are paid up! No reminders needed." />}
        renderItem={({ item: c }) => {
          const cl = calcCustomer(c);
          return (
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                <Avatar name={c.name} size={42} index={customers.indexOf(c)} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: T.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                    {c.phone ? `📱 ${c.phone}` : 'No phone saved'} · Due: ₹{cl.dueAmt}
                  </Text>
                </View>
                <View style={{ backgroundColor: COLORS.dangerLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: COLORS.dangerDark, fontSize: 12, fontWeight: '800' }}>₹{cl.dueAmt}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: '#E8FDD8', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#1A3C1A', lineHeight: 18 }}>{buildMsg(c)}</Text>
              </View>
              <TouchableOpacity style={s.waBtn} onPress={() => openWA(c)}>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>📤 Send on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: 'white', fontSize: 20, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  sendAllBtn: { backgroundColor: COLORS.whatsapp, borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 14 },
  card: { borderRadius: 16, borderWidth: 0.5, marginBottom: 12, overflow: 'hidden' },
  waBtn: { backgroundColor: COLORS.whatsapp, padding: 13, alignItems: 'center' },
});
