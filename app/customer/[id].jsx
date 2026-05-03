// app/customer/[id].jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Linking, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { Avatar, Badge } from '../../src/components';

// ─── Helpers (self-contained, NO shared parser bug) ───────────────────────────

// Parse rawStr safely — each token is independent
// Formats supported:
//   "1, 2, 3"            → all unpaid
//   "1, 2 paid, 3"       → only 2 is paid
//   "1, 2, 3 paid"       → only 3 is paid  (NOT 1,2,3)
//   "1, 2, 3, paid"      → standalone "paid" after commas = all buffered paid (legacy)
function parseDates(str) {
  if (!str || !str.trim()) return [];
  const result = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let standaloneBuffer = []; // for legacy "1, 2, 3, paid" format

  for (const tok of tokens) {
    const lower   = tok.toLowerCase();
    const nums    = tok.match(/\d+/g) || [];
    const hasPaid = lower.includes('paid');

    if (nums.length === 0 && hasPaid) {
      // Standalone "paid" token — mark all buffered as paid (legacy support)
      for (const d of standaloneBuffer) result.push({ date: d, paid: true });
      standaloneBuffer = [];
    } else if (nums.length > 0 && hasPaid) {
      // "17 paid" or "17paid" — flush standalone buffer as unpaid first, then this as paid
      for (const d of standaloneBuffer) result.push({ date: d, paid: false });
      standaloneBuffer = [];
      result.push({ date: parseInt(nums[0]), paid: true });
    } else if (nums.length > 0) {
      // Pure number token "17" — buffer it
      for (const n of nums) standaloneBuffer.push(parseInt(n));
    }
  }
  // Remaining buffer = unpaid
  for (const d of standaloneBuffer) result.push({ date: d, paid: false });
  return result;
}

// Build rawStr — each date written individually, unambiguous
// "1, 2, 17 paid" — NO grouping, each is its own token
function buildRaw(dates) {
  const sorted = [...dates].sort((a, b) => a.date - b.date);
  return sorted.map(d => d.paid ? `${d.date} paid` : `${d.date}`).join(', ');
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MonthCalendar({ displayDate, rawStr, offDays, onUpdate, T }) {
  const TODAY_FULL = new Date();
  const YEAR      = displayDate.getFullYear();
  const MONTH     = displayDate.getMonth();
  const totalDays = new Date(YEAR, MONTH + 1, 0).getDate();
  const firstDOW  = new Date(YEAR, MONTH, 1).getDay();
  const monthName = displayDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const [busy, setBusy] = useState(false);

  // Build status map fresh every render from rawStr
  const statusMap = useMemo(() => {
    const map = {};
    parseCustomerDates(rawStr).forEach(d => { map[d.date] = d.paid ? 'paid' : 'tiffin'; });
    // Off days — shown differently
    (offDays || []).forEach(d => { if (!map[d]) map[d] = 'off'; });
    return map;
  }, [rawStr, offDays]);

  const handleTap = async (day) => {
    const isFutureMonth = displayDate > TODAY_FULL && (displayDate.getMonth() !== TODAY_FULL.getMonth() || displayDate.getFullYear() !== TODAY_FULL.getFullYear());
    const isFutureDay = isSameMonth(displayDate, TODAY_FULL) && day > TODAY_FULL.getDate();
    
    if (isFutureMonth || isFutureDay || busy) return;
    const current = statusMap[day];

    if (current === 'off') {
      // Off day tapped — do nothing (managed separately)
      Alert.alert(`Date ${day}`, 'This is an Off Mess day. Remove it from Off Mess section below.');
      return;
    }

    setBusy(true);
    try {
      // Work on a FRESH copy of dates each time
      const currentDates = parseCustomerDates(rawStr);

      if (!current) {
        // Empty → add as tiffin (unpaid)
        const updated = [...currentDates, { date: day, paid: false }];
        await onUpdate({ rawStr: buildRawStr(updated) });

      } else if (current === 'tiffin') {
        // Orange (unpaid tiffin) → mark ONLY this specific date as paid
        const updated = currentDates.map(d =>
          d.date === day && !d.paid   // match only the unpaid one with this date
            ? { ...d, paid: true }
            : d
        );
        await onUpdate({ rawStr: buildRawStr(updated) });

      } else if (current === 'paid') {
        // Green (paid) → ask to remove
        setBusy(false);
        Alert.alert(
          `Date ${day} — Options`,
          'This date is already paid. What do you want to do?',
          [
            {
              text: '🔄 Mark as Unpaid', onPress: async () => {
                setBusy(true);
                const updated = currentDates.map(d =>
                  d.date === day && d.paid ? { ...d, paid: false } : d
                );
                await onUpdate({ rawStr: buildRawStr(updated) });
                setBusy(false);
              }
            },
            {
              text: '🗑️ Remove Date', style: 'destructive', onPress: async () => {
                setBusy(true);
                const updated = currentDates.filter(d => d.date !== day);
                await onUpdate({ rawStr: buildRawStr(updated) });
                setBusy(false);
              }
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  };

  const cells = [];
  for (let i = 0; i < firstDOW; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <View style={[cal.wrap, { backgroundColor: T.card, borderColor: T.border }]}>
      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: T.text }}>{monthName}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { color: COLORS.primary,    label: 'Tiffin' },
            { color: COLORS.success,    label: 'Paid'   },
            { color: '#94A3B8',         label: 'Off'    },
          ].map(item => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.color }} />
              <Text style={{ fontSize: 9, color: T.text2, fontWeight: '600' }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {busy && (
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>Updating...</Text>
        </View>
      )}

      {/* Day-of-week headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: T.text2 }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const isFuture = (displayDate.getMonth() > TODAY_FULL.getMonth() && displayDate.getFullYear() >= TODAY_FULL.getFullYear()) || 
                           (isSameMonth(displayDate, TODAY_FULL) && day > TODAY_FULL.getDate());
          const isToday  = isSameMonth(displayDate, TODAY_FULL) && day === TODAY_FULL.getDate();
          const status   = statusMap[day];

          let bg     = 'transparent';
          let border = 'transparent';
          let tc     = isFuture ? T.text3 : T.text;

          if (isToday && !status)       { border = COLORS.primary; tc = COLORS.primary; bg = 'rgba(255, 107, 44, 0.05)'; }
          if (status === 'tiffin')      { bg = COLORS.primaryLight;  border = COLORS.primary; tc = COLORS.primaryDark; }
          if (status === 'paid')        { bg = COLORS.successLight;  border = COLORS.success; tc = COLORS.successDark; }
          if (status === 'off')         { bg = '#F1F5F9'; border = '#94A3B8'; tc = '#64748B'; }

          return (
            <TouchableOpacity
              key={day}
              style={[cal.cell, cal.cellBtn, { backgroundColor: bg, borderColor: border, opacity: isFuture ? 0.28 : 1 }]}
              onPress={() => handleTap(day)}
              disabled={isFuture || busy}
              activeOpacity={0.65}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tc }}>{day}</Text>
              {status === 'paid'   && <Text style={{ fontSize: 7, color: COLORS.successDark, fontWeight: '900' }}>✓</Text>}
              {status === 'tiffin' && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 1 }} />}
              {status === 'off'    && <Text style={{ fontSize: 7, color: '#64748B', fontWeight: '700' }}>off</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ fontSize: 10, color: T.text3, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
        Tap: empty → tiffin (🟠) → paid (🟢) · Long tap paid to undo
      </Text>
    </View>
  );
}

// ─── Off Mess Modal ────────────────────────────────────────────────────────────
function OffMessModal({ visible, onClose, customer, displayDate, onUpdate, T }) {
  const TODAY_FULL = new Date();
  const YEAR   = displayDate.getFullYear();
  const MONTH  = displayDate.getMonth();
  const totalD = new Date(YEAR, MONTH + 1, 0).getDate();
  const firstD = new Date(YEAR, MONTH, 1).getDay();

  const offDays   = customer.offDays || [];
  const [busy, setBusy] = useState(false);

  const toggleOff = async (day) => {
    const isFutureMonth = displayDate > TODAY_FULL && (displayDate.getMonth() !== TODAY_FULL.getMonth() || displayDate.getFullYear() !== TODAY_FULL.getFullYear());
    const isFutureDay = isSameMonth(displayDate, TODAY_FULL) && day > TODAY_FULL.getDate();

    if (isFutureMonth || isFutureDay || busy) return;
    setBusy(true);
    try {
      const tiffDates = parseCustomerDates(customer.rawStr).map(d => d.date);
      if (tiffDates.includes(day)) {
        Alert.alert('Cannot Mark Off', `Date ${day} is already marked as a tiffin day. Remove it from the calendar first.`);
        setBusy(false);
        return;
      }
      const newOff = offDays.includes(day)
        ? offDays.filter(d => d !== day)
        : [...offDays, day].sort((a, b) => a - b);
      await onUpdate({ offDays: newOff });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  };

  const cells = [];
  for (let i = 0; i < firstD; i++) cells.push(null);
  for (let d = 1; d <= totalD; d++) cells.push(d);

  const tiffSet = new Set(parseCustomerDates(customer.rawStr).map(d => d.date));
  const monthName = displayDate.toLocaleDateString('en-IN', { month: 'long' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[off.sheet, { backgroundColor: T.card }]}>
          <View style={[off.handle, { backgroundColor: T.border }]} />
          <Text style={[off.title, { color: T.text }]}>🚫 Off Mess Days</Text>
          <Text style={{ color: T.text2, fontSize: 13, marginBottom: 16 }}>
            {customer.name} · {monthName} {YEAR}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#94A3B8' }} />
              <Text style={{ fontSize: 11, color: T.text2 }}>Off Mess (no tiffin)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary }} />
              <Text style={{ fontSize: 11, color: T.text2 }}>Has Tiffin (can't mark off)</Text>
            </View>
          </View>

          {busy && <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />}

          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: T.text2 }}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={cal.cell} />;
              const isFuture = (displayDate.getMonth() > TODAY_FULL.getMonth() && displayDate.getFullYear() >= TODAY_FULL.getFullYear()) || 
                               (isSameMonth(displayDate, TODAY_FULL) && day > TODAY_FULL.getDate());
              const isOff     = offDays.includes(day);
              const isTiffin  = tiffSet.has(day);
              let bg = 'transparent', border = 'transparent', tc = T.text;
              if (isTiffin) { bg = COLORS.primaryLight; border = COLORS.primary; tc = COLORS.primaryDark; }
              if (isOff)    { bg = '#E2E8F0'; border = '#94A3B8'; tc = '#475569'; }
              return (
                <TouchableOpacity key={day}
                  style={[cal.cell, cal.cellBtn, { backgroundColor: bg, borderColor: border, opacity: isFuture ? 0.25 : 1 }]}
                  onPress={() => toggleOff(day)}
                  disabled={isFuture || busy || isTiffin}
                  activeOpacity={0.65}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isFuture ? T.text3 : tc }}>{day}</Text>
                  {isOff && <Text style={{ fontSize: 7, color: '#475569', fontWeight: '700' }}>off</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ backgroundColor: T.inputBg, borderRadius: 12, padding: 12, marginTop: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: T.text2 }}>
              Off days this month: {offDays.length > 0 ? offDays.join(', ') : 'None'}
            </Text>
          </View>

          <TouchableOpacity style={[off.doneBtn]} onPress={onClose}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>✅ Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PayModal({ visible, onClose, customer, displayDate, onPay, T }) {
  const TODAY_FULL = new Date();
  const IS_CURRENT = isSameMonth(displayDate, TODAY_FULL);
  const LIMIT_DAY = IS_CURRENT ? TODAY_FULL.getDate() : 31;
  const MON   = displayDate.toLocaleDateString('en-IN', { month: 'short' });

  const [mode,  setMode]  = useState('tilnow');
  const [amt,   setAmt]   = useState('');
  const [dStr,  setDStr]  = useState('');
  const [note,  setNote]  = useState('');
  const [busy,  setBusy]  = useState(false);

  const cl = calcCustomer(customer);

  // Till-now unpaid
  const tilNowList = cl.dates.filter(d => d.date <= LIMIT_DAY && !d.paid);
  const tilNowAmt  = tilNowList.length * customer.rate;

  // Custom dates
  const custNums = dStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
  const custAmt  = custNums.length > 0 ? custNums.length * customer.rate : parseInt(amt) || 0;
  const payAmt   = mode === 'tilnow' ? tilNowAmt : custAmt;

  const reset = () => { setAmt(''); setDStr(''); setNote(''); };

  const handlePay = async () => {
    if (!payAmt || payAmt <= 0) {
      Alert.alert('Invalid', mode === 'tilnow' ? 'No unpaid tiffins found up to today. Mark dates on calendar first.' : 'Enter dates or amount.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'tilnow') {
        // Mark all unpaid tiffins up to today as paid in rawStr
        const updated = parseCustomerDates(customer.rawStr).map(d => {
          return (d.date <= LIMIT_DAY && !d.paid) ? { ...d, paid: true } : d;
        });
        await onPay(tilNowAmt, note || `Till ${LIMIT_DAY} ${MON}`, buildRawStr(updated));

      } else if (custNums.length > 0) {
        // Mark specific entered dates as paid
        let all = parseCustomerDates(customer.rawStr);
        custNums.forEach(n => {
          const exists = all.find(d => d.date === n);
          if (exists) {
            all = all.map(d => d.date === n ? { ...d, paid: true } : d);
          } else {
            all.push({ date: n, paid: true });
          }
        });
        await onPay(custAmt, note || `Dates: ${custNums.join(', ')}`, buildRawStr(all));

      } else {
        // Just amount, no date changes
        await onPay(parseInt(amt) || 0, note || 'Custom payment');
      }
      reset(); onClose();
      Alert.alert('✅ Payment Saved!', `₹${payAmt} recorded for ${customer.name}`);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { reset(); onClose(); }} activeOpacity={1} />
        <View style={[pm.sheet, { backgroundColor: T.card }]}>
          <View style={[pm.handle, { backgroundColor: T.border }]} />
          <Text style={[pm.title, { color: T.text }]}>💰 Record Payment</Text>
          <Text style={{ color: T.text2, fontSize: 13, marginBottom: 16 }}>
            {customer.name} · {MON} Due: ₹{cl.dueAmt}
          </Text>

          {/* Mode tabs */}
          <View style={[pm.tabs, { backgroundColor: T.inputBg }]}>
            {[{ key: 'tilnow', label: '📅 Till Now Paid' }, { key: 'custom', label: '✏️ Custom Pay' }].map(m => (
              <TouchableOpacity key={m.key} onPress={() => setMode(m.key)}
                style={[pm.tab, { backgroundColor: mode === m.key ? COLORS.primary : 'transparent' }]}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: mode === m.key ? 'white' : T.text2 }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'tilnow' ? (
            <View style={[pm.box, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 6 }}>
                Till {IS_CURRENT ? 'Today' : 'End of Month'} — {IS_CURRENT ? TODAY_FULL.getDate() : 'End'} {MON}
              </Text>
              <Text style={{ fontSize: 12, color: T.text2 }}>
                Unpaid tiffins: {tilNowList.length} × ₹{customer.rate}
              </Text>
              <Text style={{ fontSize: 12, color: T.text2, marginBottom: 8 }}>
                Dates: {tilNowList.length > 0 ? tilNowList.map(d => d.date).join(', ') : 'None unpaid'}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: COLORS.primary }}>₹{tilNowAmt}</Text>
              {tilNowAmt === 0 && (
                <Text style={{ fontSize: 12, color: COLORS.warning, marginTop: 6 }}>
                  ⚠️ Mark dates on calendar first, then come back here.
                </Text>
              )}
            </View>
          ) : (
            <View style={[pm.box, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 8 }}>
                Pay for Specific Dates
              </Text>
              <Text style={{ fontSize: 11, color: T.text2, marginBottom: 6 }}>
                Enter date numbers (auto-calculates ₹{customer.rate} × each date):
              </Text>
              <TextInput
                style={[pm.input, { backgroundColor: T.card, borderColor: T.border, color: T.text }]}
                placeholder="e.g. 1, 5, 10, 15"
                placeholderTextColor={T.text3}
                value={dStr}
                onChangeText={setDStr}
                keyboardType="default"
              />
              {custNums.length > 0 && (
                <View style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>
                    {custNums.length} dates × ₹{customer.rate} =
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary }}>₹{custAmt}</Text>
                </View>
              )}
              {custNums.length === 0 && (
                <>
                  <Text style={{ fontSize: 11, color: T.text2, marginBottom: 4 }}>
                    Or enter any amount directly:
                  </Text>
                  <TextInput
                    style={[pm.input, { backgroundColor: T.card, borderColor: T.border, color: T.text }]}
                    placeholder={`₹ Amount (due: ₹${cl.dueAmt})`}
                    placeholderTextColor={T.text3}
                    value={amt}
                    onChangeText={setAmt}
                    keyboardType="numeric"
                  />
                </>
              )}
            </View>
          )}

          <TextInput
            style={[pm.input, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text, marginTop: 10 }]}
            placeholder="Note (optional)..."
            placeholderTextColor={T.text3}
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={[pm.payBtn, { opacity: busy || payAmt === 0 ? 0.55 : 1 }]}
            onPress={handlePay} disabled={busy || payAmt === 0}>
            {busy
              ? <ActivityIndicator color="white" />
              : <Text style={pm.payBtnText}>✅ Pay ₹{payAmt}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => { reset(); onClose(); }}>
            <Text style={{ color: T.text2, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Helper
const isSameMonth = (d1, d2) => 
  d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();


// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CustomerDetailScreen() {
  const { id }   = useLocalSearchParams();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { customers, settings, markPayment, updateCustomer, deleteCustomer } = useApp();
  const T        = settings?.darkMode ? COLORS.dark : COLORS.light;

  const c   = customers.find(x => x._id === id);
  const idx = c ? customers.indexOf(c) : 0;

  const [viewDate,   setViewDate]   = useState(new Date());
  const [showPay,    setShowPay]    = useState(false);
  const [showOff,    setShowOff]    = useState(false);
  const [note,       setNote]       = useState(c?.note || '');
  const [busyNote,   setBusyNote]   = useState(false);

  // Data key for storage: YYYY-MM
  const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth() + 1}`;
  const isTodayMonth = isSameMonth(viewDate, new Date());

  // Local virtual customer for the selected month
  const currentMonthData = useMemo(() => {
    if (!c) return { rawStr: '', offDays: [] };
    return {
      rawStr: c.tiffinsByMonth?.[monthKey] || (isTodayMonth ? c.rawStr : ''),
      offDays: c.offDaysByMonth?.[monthKey] || (isTodayMonth ? c.offDays : []),
    };
  }, [c, monthKey]);

  const handleCalUpdate = useCallback(async (updates) => {
    const newTiffins = { ...(c.tiffinsByMonth || {}) };
    const newOff     = { ...(c.offDaysByMonth || {}) };

    if (updates.rawStr !== undefined) newTiffins[monthKey] = updates.rawStr;
    if (updates.offDays !== undefined) newOff[monthKey] = updates.offDays;

    const payload = { tiffinsByMonth: newTiffins, offDaysByMonth: newOff };

    // Sync with legacy fields if we are updating the current month
    if (isTodayMonth && updates.rawStr !== undefined) payload.rawStr = updates.rawStr;
    if (isTodayMonth && updates.offDays !== undefined) payload.offDays = updates.offDays;

    await updateCustomer(c._id, payload);
  }, [c?._id, c.tiffinsByMonth, c.offDaysByMonth, monthKey, isTodayMonth, updateCustomer]);

  // Payment: saves amount to history + optionally updates rawStr (dates marked paid)
  const handlePay = useCallback(async (amount, noteText, newRawStr) => {
    // First record payment
    await markPayment(c._id, amount, noteText, monthKey);
    // Then update rawStr if dates were marked paid
    if (newRawStr !== null && newRawStr !== undefined) {
      await handleCalUpdate({ rawStr: newRawStr });
    }
  }, [c?._id, monthKey, markPayment, handleCalUpdate]);

  const handleSaveNote = async () => {
    setBusyNote(true);
    try { await updateCustomer(c._id, { note }); Alert.alert('✅ Note saved!'); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusyNote(false); }
  };

  const handleDelete = () => Alert.alert('Delete Customer', `Delete ${c.name}? Cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomer(c._id); router.back(); } },
  ]);

  const openWA = () => {
    if (!c) return;
    const msg = `नमस्ते ${c.name} जी! 🙏\n\n*${settings?.bizName || 'Swad Tiffins'}* से payment reminder:\n📅 तिफ़िन: *${cl.total}* | ₹${cl.totalAmt}\n✅ जमा: *₹${cl.paidAmt}*\n⏳ बकाया: *₹${cl.dueAmt}*\n\nकृपया जल्द भुगतान करें। धन्यवाद! 🍱`;
    const url = c.phone
      ? `whatsapp://send?phone=91${c.phone}&text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp not found'));
  };

  if (!c) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
      <Text style={{ color: T.text, fontSize: 16, fontWeight: '700' }}>Customer not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
        <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // IMPORTANT: We calculate stats specifically for the selected month
  const virtualCustomer = useMemo(() => ({ 
    ...c, 
    rawStr: currentMonthData.rawStr, 
    offDays: currentMonthData.offDays 
  }), [c, currentMonthData]);

  const cl = useMemo(() => calcCustomer(virtualCustomer, monthKey), [virtualCustomer, monthKey]);
  const monthName = viewDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  const Sec = ({ title, children }) => (
    <View style={[s.sec, { borderBottomColor: T.border }]}>
      <Text style={[s.secTitle, { color: T.text2 }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: 'white', fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{c.name}</Text>
        <TouchableOpacity onPress={() => router.push(`/customer/edit/${c._id}`)} style={s.editBtn}>
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigator */}
      <View style={{ backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12, gap: 20 }}>
        <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navArrow}>
          <Text style={{ color: 'white', fontWeight: '900' }}>◀</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center', minWidth: 120 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>{monthName}</Text>
          {isTodayMonth && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' }}>CURRENT MONTH</Text>}
        </View>
        <TouchableOpacity onPress={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navArrow}>
          <Text style={{ color: 'white', fontWeight: '900' }}>▶</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Identity card */}
        <View style={[s.identCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <Avatar name={c.name} size={54} index={idx} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: T.text }}>{c.name}</Text>
              <Text style={{ fontSize: 12, color: T.text2, marginTop: 3, lineHeight: 19 }}>
                {c.type}{c.floor ? ' · ' + c.floor : ''}{c.phone ? ' · ' + c.phone : ''}
              </Text>
            </View>
            <Badge status={cl.status} />
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {[
              { label: 'Bill',    value: `₹${cl.totalAmt}`, color: T.text },
              { label: 'Coll.',   value: `₹${cl.paidAmt}`,  color: COLORS.success },
              { label: 'Month Due', value: `₹${cl.dueAmt}`,   color: cl.dueAmt > 0 ? COLORS.danger : COLORS.success },
              { label: 'Qty',     value: String(cl.total),   color: COLORS.primary },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: T.inputBg, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: T.text2, fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: item.color, marginTop: 2 }}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.whatsapp }]} onPress={openWA}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#E2E8F0' }]} onPress={() => setShowOff(true)}>
              <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>🚫 Off Mess</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.dangerLight }]} onPress={handleDelete}>
              <Text style={{ color: COLORS.dangerDark, fontSize: 12, fontWeight: '700' }}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calendar */}
        <Sec title="📅 TIFFIN CALENDAR">
          <MonthCalendar
            displayDate={viewDate}
            rawStr={currentMonthData.rawStr}
            offDays={currentMonthData.offDays}
            onUpdate={handleCalUpdate}
            T={T}
          />
        </Sec>

        {/* Payment buttons */}
        <Sec title="💳 PAYMENT">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[s.payBig, { backgroundColor: COLORS.success }]}
              onPress={() => setShowPay(true)}>
              <Text style={{ fontSize: 22 }}>📅</Text>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>Till Now Paid</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center', lineHeight: 14 }}>
                Auto-calc unpaid{'\n'}up to today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payBig, { backgroundColor: COLORS.primary }]}
              onPress={() => setShowPay(true)}>
              <Text style={{ fontSize: 22 }}>✏️</Text>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>Custom Pay</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center', lineHeight: 14 }}>
                Enter dates{'\n'}or any amount
              </Text>
            </TouchableOpacity>
          </View>
        </Sec>

        {/* Off Mess summary */}
        {(currentMonthData.offDays || []).length > 0 && (
          <Sec title="🚫 OFF MESS DAYS">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {(currentMonthData.offDays || []).map(d => (
                <View key={d} style={{ backgroundColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: '#475569', fontWeight: '700' }}>🚫 {d}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: T.text2 }}>
              {(currentMonthData.offDays || []).length} off day(s) in {monthName}
            </Text>
          </Sec>
        )}

        {/* Payment history */}
        {c.paymentHistory?.length > 0 && (
          <Sec title={`🕐 PAYMENT HISTORY (${c.paymentHistory.length})`}>
            {c.paymentHistory.slice().reverse().slice(0, 8).map((h, i) => (
              <View key={i} style={[s.histRow, { borderBottomColor: T.border }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginTop: 5 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>₹{h.amount} paid</Text>
                  <Text style={{ fontSize: 11, color: T.text2 }}>
                    {new Date(h.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    {h.note ? ' · ' + h.note : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.success }}>+₹{h.amount}</Text>
              </View>
            ))}
          </Sec>
        )}

        {/* Notes */}
        <Sec title="📝 NOTES">
          <TextInput
            style={[s.noteInput, { backgroundColor: T.inputBg, borderColor: T.border, color: T.text }]}
            placeholder="Add notes..." placeholderTextColor={T.text3}
            value={note} onChangeText={setNote} multiline numberOfLines={3}
          />
          <TouchableOpacity onPress={handleSaveNote} disabled={busyNote}
            style={{ backgroundColor: COLORS.primaryLight, borderRadius: 10, padding: 11, alignItems: 'center', marginTop: 8, opacity: busyNote ? 0.6 : 1 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 13 }}>
              {busyNote ? '💾 Saving...' : '💾 Save Note'}
            </Text>
          </TouchableOpacity>
        </Sec>

      </ScrollView>

      <PayModal
        visible={showPay}
        onClose={() => setShowPay(false)}
        customer={virtualCustomer}
        displayDate={viewDate}
        onPay={handlePay}
        T={T}
      />
      <OffMessModal
        visible={showOff}
        onClose={() => setShowOff(false)}
        customer={virtualCustomer}
        displayDate={viewDate}
        onUpdate={handleCalUpdate}
        T={T}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: 'white', fontSize: 17, fontWeight: '800' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  navArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  identCard: { margin: 16, borderRadius: 18, borderWidth: 0.5, padding: 16 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center' },
  sec: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 0.5 },
  secTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 12 },
  payBig: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  histRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 0.5 },
  noteInput: { borderWidth: 0.5, borderRadius: 12, padding: 12, fontSize: 13, minHeight: 70, textAlignVertical: 'top' },
});

const cal = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 0.5, padding: 14 },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellBtn: { borderRadius: 10, borderWidth: 1.5 },
});

const off = StyleSheet.create({
  sheet: { borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 14 },
});

const pm = StyleSheet.create({
  sheet: { borderRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 14, gap: 4 },
  tab: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  box: { borderRadius: 14, borderWidth: 0.5, padding: 14, marginBottom: 4 },
  input: { borderWidth: 0.5, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  payBtn: { backgroundColor: COLORS.success, borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 4, marginBottom: 4 },
  payBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
});
