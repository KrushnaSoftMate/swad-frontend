// app/(tabs)/report.jsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, Platform, StyleSheet } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { DetailItem } from '../../src/components';

export default function ReportTab() {
  const { customers, settings, summary } = useApp();
  const T = settings?.darkMode ? COLORS.dark : COLORS.light;
  const now = new Date();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const buildText = () => {
    const sep = '═'.repeat(36);
    let txt = `${sep}\n  ${settings?.bizName || 'Swad Tiffins'}\n  Report — ${monthName}\n${sep}\n\n`;
    txt += `SUMMARY\n${'─'.repeat(30)}\n`;
    txt += `Customers : ${summary.totalCustomers}\nTiffins   : ${summary.totalTiffins}\nRevenue   : ₹${summary.totalRevenue}\nCollected : ₹${summary.totalCollected}\nPending   : ₹${summary.totalDue}\n\n`;
    txt += `CUSTOMER BREAKDOWN\n${'─'.repeat(30)}\n`;
    customers.forEach(c => {
      const cl = calcCustomer(c);
      txt += `\n${c.name}${c.floor ? ' ('+c.floor+')' : ''}\n  ${cl.total} tiffins @ ₹${c.rate}/day\n  Bill: ₹${cl.totalAmt} | Paid: ₹${cl.paidAmt} | Due: ₹${cl.dueAmt}\n  [${cl.status.toUpperCase()}]\n`;
    });
    txt += `\n${sep}\n${now.toLocaleString('en-IN')}\n${sep}`;
    return txt;
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>📊 Monthly Report</Text>
        <Text style={s.headerSub}>{monthName} · {settings?.bizName}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
          <Text style={[s.cardTitle, { color: T.text }]}>Overview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Total Tiffins"  value={String(summary.totalTiffins  || 0)} theme={T} />
            <DetailItem label="Total Revenue"  value={`₹${(summary.totalRevenue  ||0).toLocaleString()}`} valueColor={COLORS.primary} theme={T} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Collected"      value={`₹${(summary.totalCollected||0).toLocaleString()}`} valueColor={COLORS.success} theme={T} />
            <DetailItem label="Pending"        value={`₹${(summary.totalDue      ||0).toLocaleString()}`} valueColor={COLORS.danger}  theme={T} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Customers Paid" value={String(summary.paidCount || 0)} valueColor={COLORS.success} theme={T} />
            <DetailItem label="Customers Due"  value={String(summary.dueCount  || 0)} valueColor={COLORS.danger}  theme={T} />
          </View>
        </View>

        {/* Table */}
        <View style={[s.card, { backgroundColor: T.card, borderColor: T.border, marginTop: 12 }]}>
          <Text style={[s.cardTitle, { color: T.text, marginBottom: 12 }]}>All Customers</Text>
          <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
            {['Customer','Tiffins','Bill','Paid','Due'].map((h, i) => (
              <Text key={i} style={{ flex: i===0?2:1, fontSize: 9, fontWeight: '700', color: T.text2, textTransform: 'uppercase' }}>{h}</Text>
            ))}
          </View>
          {customers.map((c, i) => {
            const cl = calcCustomer(c);
            return (
              <View key={c._id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.border, backgroundColor: i%2===0 ? 'transparent' : T.inputBg }}>
                <View style={{ flex: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.text }} numberOfLines={1}>{c.name}</Text>
                  {!!c.floor && <Text style={{ fontSize: 9, color: T.text3 }}>{c.floor}</Text>}
                </View>
                <Text style={{ flex: 1, fontSize: 11, color: T.text }}>{cl.total}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: T.text }}>₹{cl.totalAmt}</Text>
                <Text style={{ flex: 1, fontSize: 11, color: COLORS.success }}>₹{cl.paidAmt}</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: cl.dueAmt > 0 ? COLORS.danger : COLORS.success }}>₹{cl.dueAmt}</Text>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', paddingVertical: 9, backgroundColor: T.inputBg, borderTopWidth: 1, borderTopColor: T.border }}>
            <Text style={{ flex: 2, fontSize: 12, fontWeight: '900', color: T.text }}>TOTAL</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: T.text }}>{summary.totalTiffins}</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: T.text }}>₹{summary.totalRevenue}</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.success }}>₹{summary.totalCollected}</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.danger }}>₹{summary.totalDue}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: buildText(), title: `Swad Tiffins Report — ${monthName}` })}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>📤 Share Report (WhatsApp / Email)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 18, paddingBottom: 16 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 0.5, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  shareBtn: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 14 },
});
