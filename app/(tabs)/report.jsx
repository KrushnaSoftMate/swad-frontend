// app/(tabs)/report.jsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Share,
  StyleSheet, Linking, Alert, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { DetailItem } from '../../src/components';

const TODAY = new Date().getDate();
const NOW   = new Date();

// ─── Off-Mess Broadcast Modal ─────────────────────────────────────────────────
function OffMessModal({ visible, onClose, customers, settings, T }) {
  const biz = settings?.bizName || 'Swad Tiffins';

  // Date picker state — default to today
  const [selDay,    setSelDay]   = useState(String(TODAY));
  const [customMsg, setCustomMsg] = useState('');
  const [mode,      setMode]     = useState('today'); // 'today' | 'custom'

  const pickedDate = parseInt(selDay) || TODAY;
  const dateLabel  = (() => {
    try {
      const d = new Date(NOW.getFullYear(), NOW.getMonth(), pickedDate);
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return `Date ${pickedDate}`; }
  })();

  const buildMsg = () => {
    if (customMsg.trim()) return customMsg.trim();
    return `नमस्ते! 🙏\n\n*${biz}* की तरफ से सूचना:\n\n🚫 *${dateLabel} को मेस बंद रहेगा।*\n\nकोई तिफ़िन नहीं दिया जाएगा।\nअसुविधा के लिए क्षमा करें।\n\nधन्यवाद 🍱`;
  };

  // Customers who have tiffin on pickedDate (and not already marked off)
  const affectedCustomers = customers.filter(c => {
    const offDays = c.offDays || [];
    if (offDays.includes(pickedDate)) return false;
    return calcCustomer(c).dates.some(d => d.date === pickedDate);
  });

  const sendToAll = () => {
    const msg = buildMsg();
    // Open WhatsApp with the message; user can copy+paste to groups or send individually
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp.'));
  };

  const sendToFirst = () => {
    if (!affectedCustomers.length) { Alert.alert('No customers', `No customers have tiffin on date ${pickedDate}.`); return; }
    const c   = affectedCustomers[0];
    const msg = buildMsg();
    const url = c.phone
      ? `whatsapp://send?phone=91${c.phone}&text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp not found'));
  };

  const shareMsg = () => Share.share({ message: buildMsg(), title: `Off Mess Notice — ${dateLabel}` });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[om.sheet, { backgroundColor: T.card }]}>
          <View style={[om.handle, { backgroundColor: T.border }]} />
          <Text style={[om.title, { color: T.text }]}>🚫 Send Off-Mess Notice</Text>
          <Text style={{ color: T.text2, fontSize: 13, marginBottom: 16 }}>
            Notify customers that mess will be closed
          </Text>

          {/* Date mode tabs */}
          <View style={[om.tabs, { backgroundColor: T.inputBg }]}>
            {[{ key: 'today', label: `📅 Today (${TODAY})` }, { key: 'custom', label: '✏️ Custom Date' }].map(m => (
              <TouchableOpacity key={m.key} onPress={() => setMode(m.key)}
                style={[om.tab, { backgroundColor: mode === m.key ? COLORS.danger : 'transparent' }]}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: mode === m.key ? 'white' : T.text2 }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'custom' && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: T.text2, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Enter Date (1–31)
              </Text>
              <TextInput
                style={[om.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
                placeholder="e.g. 25"
                placeholderTextColor={T.text3}
                value={selDay}
                onChangeText={setSelDay}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          )}

          {/* Date info */}
          <View style={[om.infoBox, { backgroundColor: T.inputBg, borderColor: T.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: T.text, marginBottom: 4 }}>📅 {dateLabel}</Text>
            <Text style={{ fontSize: 12, color: T.text2 }}>
              {affectedCustomers.length} customers have tiffin on this date
            </Text>
            {affectedCustomers.length > 0 && (
              <Text style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>
                {affectedCustomers.map(c => c.name).join(', ')}
              </Text>
            )}
          </View>

          {/* Message preview */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: T.text2, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Message Preview
            </Text>
            <TextInput
              style={[om.input, { backgroundColor: '#E8FDD8', borderColor: '#B7EBC8', color: '#1A3C1A', minHeight: 80, textAlignVertical: 'top' }]}
              value={customMsg || buildMsg()}
              onChangeText={setCustomMsg}
              multiline
              numberOfLines={4}
            />
            <Text style={{ fontSize: 10, color: T.text3, marginTop: 3 }}>Tap to edit the message above</Text>
          </View>

          {/* Action buttons */}
          <TouchableOpacity style={[om.btn, { backgroundColor: COLORS.whatsapp }]} onPress={sendToAll}>
            <Text style={om.btnText}>💬 Send via WhatsApp (copy for groups)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[om.btn, { backgroundColor: COLORS.primary, marginTop: 8 }]} onPress={shareMsg}>
            <Text style={om.btnText}>📤 Share (SMS / Email / Other)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 12, alignItems: 'center', marginTop: 4 }} onPress={onClose}>
            <Text style={{ color: T.text2, fontWeight: '700', fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Report Screen ────────────────────────────────────────────────────────
export default function ReportTab() {
  const insets  = useSafeAreaInsets();
  const { customers, settings, summary } = useApp();
  const T       = settings?.darkMode ? COLORS.dark : COLORS.light;

  const [tab,       setTab]       = useState('monthly'); // 'monthly' | 'daily'
  const [dayInput,  setDayInput]  = useState(String(TODAY));
  const [showOff,   setShowOff]   = useState(false);

  const month = NOW.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // ── Selected day for daily report ────────────────────────────────────────
  const selDay = parseInt(dayInput) || TODAY;
  const selLabel = (() => {
    try {
      return new Date(NOW.getFullYear(), NOW.getMonth(), selDay)
        .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return `Date ${selDay}`; }
  })();

  // Customers with tiffin on selDay (not off)
  const dailyCustomers = useMemo(() =>
    customers.filter(c => {
      if ((c.offDays || []).includes(selDay)) return false;
      return calcCustomer(c).dates.some(d => d.date === selDay);
    }),
    [customers, selDay]
  );
  const dailyPaid = dailyCustomers.filter(c =>
    calcCustomer(c).dates.find(d => d.date === selDay && d.paid)
  );
  const dailyUnpaid = dailyCustomers.filter(c =>
    calcCustomer(c).dates.find(d => d.date === selDay && !d.paid)
  );
  const dailyRevenue = dailyCustomers.reduce((sum, c) => sum + c.rate, 0);
  const dailyCollected = dailyPaid.reduce((sum, c) => sum + c.rate, 0);

  // ── Monthly report text ───────────────────────────────────────────────────
  const buildMonthlyText = () => {
    const sep = '═'.repeat(36);
    let txt = `${sep}\n  ${settings?.bizName || 'Swad Tiffins'}\n  Monthly Report — ${month}\n${sep}\n\n`;
    txt += `SUMMARY\n${'─'.repeat(30)}\n`;
    txt += `Customers : ${summary.totalCustomers}\nTiffins   : ${summary.totalTiffins}\nRevenue   : ₹${summary.totalRevenue}\nCollected : ₹${summary.totalCollected}\nPending   : ₹${summary.totalDue}\n\n`;
    txt += `CUSTOMER DETAILS\n${'─'.repeat(30)}\n`;
    customers.forEach(c => {
      const cl = calcCustomer(c);
      txt += `\n${c.name}${c.floor ? ' ('+c.floor+')' : ''}\n`;
      txt += `  ${cl.total} tiffins @ ₹${c.rate} | Bill: ₹${cl.totalAmt} | Paid: ₹${cl.paidAmt} | Due: ₹${cl.dueAmt}\n`;
      txt += `  [${cl.status.toUpperCase()}]\n`;
    });
    txt += `\n${sep}\n${NOW.toLocaleString('en-IN')}\n${sep}`;
    return txt;
  };

  // ── Daily report text ─────────────────────────────────────────────────────
  const buildDailyText = () => {
    const sep = '═'.repeat(36);
    let txt = `${sep}\n  ${settings?.bizName || 'Swad Tiffins'}\n  Daily Report — ${selLabel}\n${sep}\n\n`;
    txt += `SUMMARY\n${'─'.repeat(30)}\n`;
    txt += `Total Tiffins : ${dailyCustomers.length}\nRevenue       : ₹${dailyRevenue}\nCollected     : ₹${dailyCollected}\nPending       : ₹${dailyRevenue - dailyCollected}\n\n`;
    txt += `TIFFIN LIST (${selLabel})\n${'─'.repeat(30)}\n`;
    dailyCustomers.forEach((c, i) => {
      const d = calcCustomer(c).dates.find(dt => dt.date === selDay);
      txt += `${i+1}. ${c.name}${c.floor ? ' ('+c.floor+')' : ''} — ₹${c.rate} — ${d?.paid ? 'PAID ✓' : 'UNPAID'}\n`;
    });
    if (!dailyCustomers.length) txt += 'No tiffins on this date.\n';
    txt += `\n${sep}\n${NOW.toLocaleString('en-IN')}\n${sep}`;
    return txt;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.title}>📊 Reports</Text>
        <Text style={s.sub}>{month} · {settings?.bizName}</Text>
      </View>

      {/* Tab switcher */}
      <View style={[s.tabRow, { backgroundColor: T.card, borderBottomColor: T.border }]}>
        {[{ key: 'monthly', label: '📅 Monthly' }, { key: 'daily', label: '📆 Daily' }].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[s.tabBtn, { borderBottomColor: tab === t.key ? COLORS.primary : 'transparent' }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: tab === t.key ? COLORS.primary : T.text2 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
        {/* Off-Mess broadcast button */}
        <TouchableOpacity onPress={() => setShowOff(true)}
          style={[s.offBtn, { backgroundColor: COLORS.dangerLight }]}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.dangerDark }}>🚫 Off Mess</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {tab === 'monthly' ? (
          <>
            {/* Monthly overview */}
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}>
              <Text style={[s.cardTitle, { color: T.text }]}>Monthly Overview — {month}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <DetailItem label="Total Tiffins" value={String(summary.totalTiffins  || 0)} theme={T} />
                <DetailItem label="Total Revenue" value={`₹${(summary.totalRevenue   || 0).toLocaleString()}`} valueColor={COLORS.primary} theme={T} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <DetailItem label="Collected" value={`₹${(summary.totalCollected || 0).toLocaleString()}`} valueColor={COLORS.success} theme={T} />
                <DetailItem label="Pending"   value={`₹${(summary.totalDue       || 0).toLocaleString()}`} valueColor={COLORS.danger}  theme={T} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <DetailItem label="Paid Customers" value={String(summary.paidCount || 0)} valueColor={COLORS.success} theme={T} />
                <DetailItem label="Due Customers"  value={String(summary.dueCount  || 0)} valueColor={COLORS.danger}  theme={T} />
              </View>
            </View>

            {/* Monthly customer table */}
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border, marginTop: 12 }]}>
              <Text style={[s.cardTitle, { color: T.text, marginBottom: 12 }]}>Customer Breakdown</Text>
              <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.border }}>
                {['Customer', 'Days', 'Bill', 'Paid', 'Due'].map((h, i) => (
                  <Text key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 9, fontWeight: '700', color: T.text2, textTransform: 'uppercase' }}>{h}</Text>
                ))}
              </View>
              {customers.map((c, i) => {
                const cl = calcCustomer(c);
                return (
                  <View key={c._id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: T.border, backgroundColor: i % 2 === 0 ? 'transparent' : T.inputBg }}>
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
              {/* Total row */}
              <View style={{ flexDirection: 'row', paddingVertical: 9, backgroundColor: T.inputBg, borderTopWidth: 1, borderTopColor: T.border }}>
                <Text style={{ flex: 2, fontSize: 12, fontWeight: '900', color: T.text }}>TOTAL</Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: T.text }}>{summary.totalTiffins}</Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: T.text }}>₹{summary.totalRevenue}</Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.success }}>₹{summary.totalCollected}</Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: COLORS.danger }}>₹{summary.totalDue}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: buildMonthlyText(), title: `Swad Tiffins Report — ${month}` })}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>📤 Share Monthly Report</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ── DAILY REPORT ── */}
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 12 }]}>
              <Text style={[s.cardTitle, { color: T.text }]}>Select Date</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <TextInput
                  style={[s.dayInput, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
                  value={dayInput}
                  onChangeText={setDayInput}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="DD"
                  placeholderTextColor={T.text3}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.primary }}>{selLabel}</Text>
                  <Text style={{ fontSize: 12, color: T.text2 }}>{dailyCustomers.length} tiffins scheduled</Text>
                </View>
                <TouchableOpacity onPress={() => setDayInput(String(TODAY))}
                  style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 12 }}>Today</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Daily summary cards */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Total',     value: String(dailyCustomers.length), color: COLORS.primary },
                { label: 'Paid',      value: String(dailyPaid.length),      color: COLORS.success },
                { label: 'Unpaid',    value: String(dailyUnpaid.length),    color: COLORS.danger  },
                { label: 'Revenue',   value: `₹${dailyRevenue}`,            color: T.text         },
              ].map((item, i) => (
                <View key={i} style={[s.dayStatBox, { backgroundColor: T.card, borderColor: T.border }]}>
                  <Text style={{ fontSize: 9, color: T.text2, fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: item.color, marginTop: 3 }}>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* Tiffin list for the day */}
            <View style={[s.card, { backgroundColor: T.card, borderColor: T.border, marginBottom: 12 }]}>
              <Text style={[s.cardTitle, { color: T.text, marginBottom: 10 }]}>
                🍱 Tiffin List — {selLabel}
              </Text>
              {dailyCustomers.length === 0 ? (
                <Text style={{ color: T.text2, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                  No tiffins on this date
                </Text>
              ) : (
                dailyCustomers.map((c, i) => {
                  const d       = calcCustomer(c).dates.find(dt => dt.date === selDay);
                  const isPaid  = d?.paid;
                  return (
                    <View key={c._id} style={[s.dailyRow, { borderBottomColor: T.border, backgroundColor: i % 2 === 0 ? 'transparent' : T.inputBg }]}>
                      {/* Number */}
                      <View style={[s.dailyNum, { backgroundColor: COLORS.primaryLight }]}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: COLORS.primary }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: T.text }}>{c.name}</Text>
                        {!!c.floor && <Text style={{ fontSize: 10, color: T.text2 }}>{c.floor}</Text>}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: T.text2, marginRight: 8 }}>₹{c.rate}</Text>
                      <View style={{ backgroundColor: isPaid ? COLORS.successLight : COLORS.dangerLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isPaid ? COLORS.successDark : COLORS.dangerDark }}>
                          {isPaid ? '✓ Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Off customers for this day */}
            {(() => {
              const offOnDay = customers.filter(c => (c.offDays || []).includes(selDay));
              if (!offOnDay.length) return null;
              return (
                <View style={[s.card, { backgroundColor: T.card, borderColor: '#94A3B8', borderStyle: 'dashed', marginBottom: 12 }]}>
                  <Text style={[s.cardTitle, { color: '#475569', marginBottom: 8 }]}>🚫 Off Mess on {selLabel}</Text>
                  {offOnDay.map(c => (
                    <Text key={c._id} style={{ fontSize: 13, color: '#64748B', paddingVertical: 4, fontWeight: '600' }}>• {c.name}</Text>
                  ))}
                </View>
              );
            })()}

            {/* Share buttons */}
            <TouchableOpacity style={s.shareBtn} onPress={() => Share.share({ message: buildDailyText(), title: `Daily Report — ${selLabel}` })}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>📤 Share Daily Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.shareBtn, { backgroundColor: COLORS.whatsapp, marginTop: 8 }]}
              onPress={() => {
                const msg = buildDailyText();
                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
                  Alert.alert('WhatsApp not found'));
              }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>💬 Send on WhatsApp</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Off-Mess Broadcast Modal */}
      <OffMessModal
        visible={showOff}
        onClose={() => setShowOff(false)}
        customers={customers}
        settings={settings}
        T={T}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 14 },
  title: { color: 'white', fontSize: 20, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  tabRow: {
    flexDirection: 'row', borderBottomWidth: 0.5, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3 },
  offBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10 },

  card: { borderRadius: 16, borderWidth: 0.5, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800' },

  dayInput: {
    borderWidth: 0.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 22, fontWeight: '900', width: 64, textAlign: 'center',
  },
  dayStatBox: { flex: 1, borderRadius: 14, borderWidth: 0.5, padding: 10, alignItems: 'center' },

  dailyRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, gap: 10,
  },
  dailyNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  shareBtn: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 14, alignItems: 'center', marginTop: 4 },
});

// Off-mess modal styles
const om = StyleSheet.create({
  sheet: { borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 14, gap: 4 },
  tab: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  infoBox: { borderRadius: 14, borderWidth: 0.5, padding: 12, marginBottom: 12 },
  input: { borderWidth: 0.5, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  btn: { borderRadius: 14, padding: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '800', fontSize: 14 },
});
