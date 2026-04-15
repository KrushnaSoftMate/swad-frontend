// app/(tabs)/index.jsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS, AVATARS } from '../../src/theme';
import { Avatar, Badge, DayChip, LoadingScreen, ErrorScreen, EmptyState } from '../../src/components';

const FILTERS = ['All', 'Due', 'Paid', 'Partial'];

export default function HomeTab() {
  const router = useRouter();
  const { customers, summary, settings, loading, error, refresh, seedData } = useApp();
  const isDark = settings?.darkMode;
  const T = isDark ? COLORS.dark : COLORS.light;

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const filtered = useMemo(() =>
    customers.filter(c => {
      const cl = calcCustomer(c);
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All' || cl.status === filter.toLowerCase();
      return matchSearch && matchFilter;
    }),
    [customers, search, filter]
  );

  if (loading && customers.length === 0) return <LoadingScreen theme={T} />;
  if (error) return <ErrorScreen message={error} onRetry={refresh} onSeed={seedData} theme={T} />;

  const renderCustomer = ({ item: c, index }) => {
    const cl = calcCustomer(c);
    const paidDts   = cl.dates.filter(d => d.paid);
    const unpaidDts = cl.dates.filter(d => !d.paid);
    return (
      <TouchableOpacity
        style={[s.card, { backgroundColor: T.card, borderColor: T.border }]}
        onPress={() => router.push(`/customer/${c._id}`)}
        activeOpacity={0.8}>
        <View style={s.cardHeader}>
          <Avatar name={c.name} size={44} index={index} />
          <View style={s.cardInfo}>
            <Text style={[s.cardName, { color: T.text }]}>{c.name}</Text>
            <Text style={[s.cardSub, { color: T.text2 }]}>
              {c.type}{c.floor ? ' · ' + c.floor : ''} · {cl.total} tiffins
            </Text>
          </View>
          <Badge status={cl.status} />
        </View>
        {!!c.note && (
          <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }}>📝 {c.note}</Text>
          </View>
        )}
        <View style={s.datesRow}>
          {paidDts.map((d, i)   => <DayChip key={`p${i}`} date={d.date} paid />)}
          {unpaidDts.map((d, i) => <DayChip key={`u${i}`} date={d.date} paid={false} />)}
        </View>
        <View style={[s.cardFooter, { borderTopColor: T.border }]}>
          <View style={s.footerItem}>
            <Text style={[s.footerLabel, { color: T.text2 }]}>Total</Text>
            <Text style={[s.footerVal, { color: T.text }]}>₹{cl.totalAmt}</Text>
          </View>
          <View style={s.footerItem}>
            <Text style={[s.footerLabel, { color: T.text2 }]}>Paid</Text>
            <Text style={[s.footerVal, { color: COLORS.success }]}>₹{cl.paidAmt}</Text>
          </View>
          <View style={s.footerItem}>
            <Text style={[s.footerLabel, { color: T.text2 }]}>Due</Text>
            <Text style={[s.footerVal, { color: cl.dueAmt > 0 ? COLORS.danger : COLORS.success }]}>₹{cl.dueAmt}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View style={s.logoIcon}><Text style={{ fontSize: 22 }}>🍱</Text></View>
          <View>
            <Text style={s.logoText}>{settings?.bizName || 'Swad Tiffins'}</Text>
            <Text style={s.logoSub}>TIFFIN MANAGER</Text>
          </View>
        </View>
        <Text style={s.dateBadge}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Summary strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
        {[
          { label: 'Customers', value: String(summary.totalCustomers || 0), sub: `${summary.paidCount || 0} paid`, color: COLORS.primary },
          { label: 'Tiffins',   value: String(summary.totalTiffins || 0),   sub: 'This month' },
          { label: 'Collected', value: `₹${(summary.totalCollected||0).toLocaleString()}`, color: COLORS.success },
          { label: 'Pending',   value: `₹${(summary.totalDue||0).toLocaleString()}`,       color: COLORS.danger },
        ].map((item, i) => (
          <View key={i} style={[s.sumCard, { backgroundColor: T.card, borderColor: T.border }]}>
            <Text style={[s.sumLabel, { color: T.text2 }]}>{item.label}</Text>
            <Text style={[s.sumValue, { color: item.color || T.text }]}>{item.value}</Text>
            {item.sub && <Text style={[s.sumSub, { color: T.text2 }]}>{item.sub}</Text>}
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={[s.searchBar, { backgroundColor: T.card, borderColor: T.border }]}>
        <Text style={{ fontSize: 14, color: T.text2 }}>🔍</Text>
        <TextInput style={[s.searchInput, { color: T.text }]} placeholder="Search customer..."
          placeholderTextColor={T.text3} value={search} onChangeText={setSearch} />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: T.text2, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 10 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 0.5,
              backgroundColor: filter === f ? COLORS.primary : T.card,
              borderColor: filter === f ? COLORS.primary : T.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: filter === f ? 'white' : T.text2 }}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <View style={{ paddingHorizontal: 16, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: T.text }}>Customers</Text>
        <Text style={{ fontSize: 11, color: T.text2, fontWeight: '700' }}>{filtered.length} shown</Text>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={c => c._id}
        renderItem={renderCustomer}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          customers.length === 0
            ? <EmptyState icon="🌱" text={"No customers yet!\nGo to Settings → Seed Data to load your 15 customers"} />
            : <EmptyState icon="🔍" text="No customers match your search" />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 54 : 18, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  logoIcon: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: 'white', fontWeight: '800', fontSize: 19 },
  logoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: 1.2 },
  dateBadge: { color: 'rgba(255,255,255,0.9)', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  sumCard: { borderRadius: 16, padding: 13, minWidth: 115, borderWidth: 0.5 },
  sumLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sumValue: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  sumSub: { fontSize: 10, marginTop: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 12, borderWidth: 0.5 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  card: { borderRadius: 16, borderWidth: 0.5, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '800' },
  cardSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  datesRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 13, paddingBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, paddingHorizontal: 13, borderTopWidth: 0.5 },
  footerItem: { alignItems: 'center' },
  footerLabel: { fontSize: 10 },
  footerVal: { fontSize: 13, fontWeight: '800', marginTop: 1 },
});
