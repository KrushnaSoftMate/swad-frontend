// app/(tabs)/index.jsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, RefreshControl, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { Avatar, Badge, DayChip, LoadingScreen, ErrorScreen, EmptyState } from '../../src/components';

const FILTERS = [
  { key: 'all',     label: 'All',     color: COLORS.primary },
  { key: 'due',     label: 'Due',     color: COLORS.danger  },
  { key: 'partial', label: 'Partial', color: COLORS.warning  },
  { key: 'paid',    label: 'Paid',    color: COLORS.success  },
];

const TODAY = new Date().getDate();
const TODAY_LABEL = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
const TODAY_FULL  = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function HomeTab() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { customers, summary, settings, loading, error, refresh, seedData } = useApp();
  const T        = settings?.darkMode ? COLORS.dark : COLORS.light;
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  // ── Today's tiffin customers ──────────────────────────────────────────────
  const todayCustomers = useMemo(() =>
    customers.filter(c => {
      const offDays = c.offDays || [];
      if (offDays.includes(TODAY)) return false;          // marked off
      const dates   = calcCustomer(c).dates;
      return dates.some(d => d.date === TODAY);           // has tiffin today
    }),
    [customers]
  );
  const todayCount = todayCustomers.length;

  // ── Filter counts ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const r = { all: customers.length, due: 0, partial: 0, paid: 0 };
    customers.forEach(c => { const st = calcCustomer(c).status; r[st] = (r[st] || 0) + 1; });
    return r;
  }, [customers]);

  const filtered = useMemo(() =>
    customers.filter(c => {
      const cl = calcCustomer(c);
      const q  = search.toLowerCase();
      return (c.name.toLowerCase().includes(q) || (c.floor || '').toLowerCase().includes(q))
        && (filter === 'all' || cl.status === filter);
    }),
    [customers, search, filter]
  );

  if (loading && !customers.length) return <LoadingScreen theme={T} />;
  if (error)                        return <ErrorScreen message={error} onRetry={refresh} onSeed={seedData} theme={T} />;

  // ── Send today's off-mess WhatsApp to all ─────────────────────────────────
  const sendTodayOffMsg = () => {
    const biz = settings?.bizName || 'Swad Tiffins';
    const msg = `नमस्ते! 🙏\n\n*${biz}* की तरफ से सूचना:\n\n🚫 *आज ${TODAY_FULL} को मेस बंद है।*\n\nकोई तिफ़िन नहीं दिया जाएगा।\nअसुविधा के लिए क्षमा करें।\n\nधन्यवाद 🍱`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp not found', 'Please install WhatsApp.'));
  };

  const renderItem = ({ item: c, index }) => {
    const cl      = calcCustomer(c);
    const paidDts = cl.dates.filter(d => d.paid);
    const unpDts  = cl.dates.filter(d => !d.paid);
    const isToday = cl.dates.some(d => d.date === TODAY);
    return (
      <TouchableOpacity style={[s.card, { backgroundColor: T.card, borderColor: isToday ? COLORS.primary : T.border }]}
        onPress={() => router.push(`/customer/${c._id}`)} activeOpacity={0.78}>
        {isToday && (
          <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>🍱 Tiffin today</Text>
          </View>
        )}
        <View style={s.cardHeader}>
          <Avatar name={c.name} size={44} index={index} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.cardName, { color: T.text }]} numberOfLines={1}>{c.name}</Text>
            <Text style={[s.cardSub,  { color: T.text2 }]} numberOfLines={1}>
              {c.type}{c.floor ? ' · ' + c.floor : ''} · {cl.total} tiffins
            </Text>
          </View>
          <Badge status={cl.status} />
        </View>
        {!!c.note && (
          <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }} numberOfLines={1}>📝 {c.note}</Text>
          </View>
        )}
        {cl.dates.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 13, paddingBottom: 8 }}>
            {paidDts.slice(0, 12).map((d, i) => <DayChip key={`p${i}`} date={d.date} paid />)}
            {unpDts.slice(0,  12).map((d, i) => <DayChip key={`u${i}`} date={d.date} paid={false} />)}
          </View>
        )}
        <View style={[s.cardFooter, { borderTopColor: T.border }]}>
          {[
            { label: 'Total', value: `₹${cl.totalAmt}`, color: T.text },
            { label: 'Paid',  value: `₹${cl.paidAmt}`,  color: COLORS.success },
            { label: 'Due',   value: `₹${cl.dueAmt}`,   color: cl.dueAmt > 0 ? COLORS.danger : COLORS.success },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={{ width: 0.5, height: 28, backgroundColor: T.border }} />}
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 9 }}>
                <Text style={{ fontSize: 10, color: T.text2, fontWeight: '600' }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: item.color, marginTop: 2 }}>{item.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const SummaryStrip = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10 }}>
      {[
        { label: "Today's Tiffins", value: String(todayCount), sub: `${TODAY_LABEL}`, color: COLORS.primary, icon: '🍱' },
        { label: 'Customers',       value: String(summary.totalCustomers || 0), sub: `${summary.paidCount || 0} paid` },
        { label: 'Collected',       value: `₹${(summary.totalCollected || 0).toLocaleString()}`, color: COLORS.success },
        { label: 'Pending',         value: `₹${(summary.totalDue || 0).toLocaleString()}`,       color: COLORS.danger  },
      ].map((item, i) => (
        <View key={i} style={[s.sumCard, { backgroundColor: T.card, borderColor: i === 0 ? COLORS.primary : T.border, borderWidth: i === 0 ? 1.5 : 0.5 }]}>
          {item.icon && <Text style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</Text>}
          <Text style={{ fontSize: 9, fontWeight: '700', color: i === 0 ? COLORS.primary : T.text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: item.color || T.text, marginTop: 2 }}>{item.value}</Text>
          {item.sub && <Text style={{ fontSize: 10, color: i === 0 ? COLORS.primary : T.text2, marginTop: 1 }}>{item.sub}</Text>}
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>
      {/* ── HEADER ── */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View style={s.logoIcon}><Text style={{ fontSize: 22 }}>🍱</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 18 }}>{settings?.bizName || 'Swad Tiffins'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: 1.2 }}>TIFFIN MANAGER</Text>
          </View>
          {/* Today's tiffin count badge in header */}
          <TouchableOpacity
            style={s.todayBadge}
            onPress={() => router.push('/report')}
            activeOpacity={0.8}>
            <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>Today</Text>
            <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '900', lineHeight: 26 }}>{todayCount}</Text>
            <Text style={{ color: COLORS.primary, fontSize: 9 }}>tiffins</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>🔍</Text>
          <TextInput style={{ flex: 1, fontSize: 13, color: 'white' }} placeholder="Search by name or floor..."
            placeholderTextColor="rgba(255,255,255,0.55)" value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>✕</Text></TouchableOpacity>}
        </View>

        {/* Send off mess WhatsApp quick button */}
        <TouchableOpacity style={s.offMessBtn} onPress={sendTodayOffMsg} activeOpacity={0.85}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>🚫 Send Today Off-Mess to All</Text>
        </TouchableOpacity>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={[s.filterBar, { backgroundColor: T.card, borderBottomColor: T.border }]}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} activeOpacity={0.7}
              style={[s.filterBtn, { borderBottomColor: active ? f.color : 'transparent' }]}>
              <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, color: active ? f.color : T.text2 }}>{f.label}</Text>
              <View style={{ borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, minWidth: 24, alignItems: 'center', backgroundColor: active ? f.color : T.inputBg }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: active ? 'white' : T.text2 }}>{counts[f.key] || 0}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filtered}
        keyExtractor={c => c._id}
        renderItem={renderItem}
        ListHeaderComponent={<>
          <SummaryStrip />
          <View style={{ paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: T.text }}>Customers</Text>
            <Text style={{ fontSize: 12, color: T.text2, fontWeight: '700' }}>{filtered.length} of {customers.length}</Text>
          </View>
        </>}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          !customers.length
            ? <EmptyState icon="🌱" text={"No customers yet!\nGo to Settings → Seed Data"} />
            : <EmptyState icon="🔍" text={`No ${filter === 'all' ? '' : filter} customers`} />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingBottom: 12 },
  logoIcon: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  todayBadge: {
    backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', minWidth: 64,
  },

  offMessBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },

  filterBar: { flexDirection: 'row', borderBottomWidth: 0.5, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  filterBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4, borderBottomWidth: 3 },

  sumCard: { borderRadius: 16, padding: 13, minWidth: 112, borderWidth: 0.5 },

  card: { borderRadius: 16, borderWidth: 0.5, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  cardName: { fontSize: 14, fontWeight: '800' },
  cardSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 0.5 },
});
