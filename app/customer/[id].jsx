// app/customer/[id].jsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, TextInput, Linking, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { calcCustomer } from '../../src/utils/api';
import { COLORS } from '../../src/theme';
import { Avatar, Badge, DayChip, DetailItem, PrimaryButton } from '../../src/components';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();
  const { customers, settings, markPayment, updateCustomer, deleteCustomer, addDate } = useApp();
  const T = settings?.darkMode ? COLORS.dark : COLORS.light;

  const c = customers.find(x => x._id === id);

  const [payAmt,      setPayAmt]      = useState('');
  const [dateInput,   setDateInput]   = useState('');
  const [note,        setNote]        = useState('');
  const [busy,        setBusy]        = useState(false);
  const [busyNote,    setBusyNote]    = useState(false);
  const [busyDate,    setBusyDate]    = useState(false);

  useEffect(() => { if (c) setNote(c.note || ''); }, [c?._id]);

  if (!c) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center', backgroundColor: T.bg }}>
      <Text style={{ fontSize:48, marginBottom:16 }}>🔍</Text>
      <Text style={{ color: T.text, fontSize:16, fontWeight:'700' }}>Customer not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={{ marginTop:14 }}>
        <Text style={{ color: COLORS.primary, fontSize:15, fontWeight:'700' }}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const cl        = calcCustomer(c);
  const paidDts   = cl.dates.filter(d => d.paid);
  const unpaidDts = cl.dates.filter(d => !d.paid);
  const idx       = customers.indexOf(c);

  const waMsg = `नमस्ते ${c.name} जी! 🙏\n\n*${settings?.bizName || 'Swad Tiffins'}* से payment reminder:\n\n📅 तिफ़िन: *${cl.total}* | ₹${cl.totalAmt}\n✅ जमा: *₹${cl.paidAmt}*\n⏳ बकाया: *₹${cl.dueAmt}*\n\nकृपया जल्द भुगतान करें। धन्यवाद! 🍱`;

  const openWA = () => {
    const phone = c.phone ? `91${c.phone}` : '';
    const url = phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(waMsg)}` : `whatsapp://send?text=${encodeURIComponent(waMsg)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp not found'));
  };

  const handlePay = async () => {
    const amount = parseInt(payAmt);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount'); return; }
    setBusy(true);
    try {
      await markPayment(c._id, amount);
      setPayAmt('');
      Alert.alert('✅ Payment Recorded', `₹${amount} paid by ${c.name} saved to MongoDB!`);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  };

  const handleAddDate = async () => {
    const d = parseInt(dateInput);
    if (!d || d < 1 || d > 31) { Alert.alert('Invalid Date', 'Enter 1–31'); return; }
    setBusyDate(true);
    try { await addDate(c._id, d); setDateInput(''); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusyDate(false); }
  };

  const handleSaveNote = async () => {
    setBusyNote(true);
    try { await updateCustomer(c._id, { note }); Alert.alert('✅ Note saved!'); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusyNote(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Customer', `Delete ${c.name}? Cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomer(c._id); router.back(); } },
    ]);
  };

  const Sec = ({ title, children }) => (
    <View style={[s.section, { borderBottomColor: T.border }]}>
      <Text style={[s.secTitle, { color: T.text2 }]}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: T.bg }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: 'white', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Customer Detail</Text>
        <TouchableOpacity onPress={() => router.push(`/customer/edit/${c._id}`)} style={s.editBtn}>
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Identity */}
        <View style={[s.identCard, { backgroundColor: T.card, borderColor: T.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <Avatar name={c.name} size={52} index={idx} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: T.text }}>{c.name}</Text>
              <Text style={{ fontSize: 12, color: T.text2, marginTop: 3, lineHeight: 18 }}>
                {c.type}{c.floor ? ' · ' + c.floor : ''}{c.phone ? '\n📱 ' + c.phone : ''}
              </Text>
            </View>
            <Badge status={cl.status} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.whatsapp }]} onPress={openWA}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: COLORS.dangerLight }]} onPress={handleDelete}>
              <Text style={{ color: COLORS.dangerDark, fontSize: 13, fontWeight: '700' }}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <Sec title="PAYMENT SUMMARY">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Total Tiffins" value={String(cl.total)}    theme={T} />
            <DetailItem label="Rate"          value={`₹${c.rate}/day`}   theme={T} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Total Bill"    value={`₹${cl.totalAmt}`}  theme={T} />
            <DetailItem label="Amount Paid"   value={`₹${cl.paidAmt}`}   valueColor={COLORS.success} theme={T} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <DetailItem label="Balance Due"   value={`₹${cl.dueAmt}`}    valueColor={cl.dueAmt > 0 ? COLORS.danger : COLORS.success} theme={T} />
            <DetailItem label="Extra Paid"    value={`₹${c.paidExtra||0}`} valueColor={COLORS.success} theme={T} />
          </View>
        </Sec>

        {/* Payment history from MongoDB */}
        {c.paymentHistory?.length > 0 && (
          <Sec title={`PAYMENT HISTORY (${c.paymentHistory.length})`}>
            {c.paymentHistory.slice().reverse().slice(0, 6).map((h, i) => (
              <View key={i} style={{ flexDirection:'row', alignItems:'flex-start', paddingVertical:8, borderBottomWidth:0.5, borderBottomColor:T.border }}>
                <View style={{ width:8, height:8, borderRadius:4, backgroundColor:COLORS.success, marginTop:4 }} />
                <View style={{ flex:1, marginLeft:10 }}>
                  <Text style={{ fontSize:13, fontWeight:'700', color:T.text }}>₹{h.amount} paid</Text>
                  <Text style={{ fontSize:11, color:T.text2 }}>{new Date(h.paidAt).toLocaleDateString('en-IN')}{h.note ? ' · '+h.note : ''}</Text>
                </View>
                <Text style={{ fontSize:14, fontWeight:'800', color:COLORS.success }}>+₹{h.amount}</Text>
              </View>
            ))}
          </Sec>
        )}

        {/* Dates */}
        {paidDts.length > 0 && (
          <Sec title="PAID DATES ✓">
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {paidDts.map((d,i) => <DayChip key={i} date={d.date} paid />)}
            </View>
          </Sec>
        )}
        {unpaidDts.length > 0 && (
          <Sec title="PENDING DATES">
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {unpaidDts.map((d,i) => <DayChip key={i} date={d.date} paid={false} />)}
            </View>
          </Sec>
        )}

        {/* Mark Payment */}
        <Sec title="MARK PAYMENT">
          <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
            <TextInput style={[s.payInput, { backgroundColor:T.inputBg, borderColor:T.border, color:T.text }]}
              placeholder={cl.dueAmt > 0 ? `₹${cl.dueAmt} due` : '₹ Amount'} placeholderTextColor={T.text3}
              value={payAmt} onChangeText={setPayAmt} keyboardType="numeric" />
            <TouchableOpacity style={[s.payBtn, { opacity: busy ? 0.6 : 1 }]} onPress={handlePay} disabled={busy}>
              {busy ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color:'white', fontWeight:'800', fontSize:13 }}>Mark Paid ✓</Text>}
            </TouchableOpacity>
          </View>
          {cl.dueAmt > 0 && (
            <TouchableOpacity onPress={() => setPayAmt(String(cl.dueAmt))} style={{ marginTop:8 }}>
              <Text style={{ fontSize:12, color:COLORS.primary, fontWeight:'600' }}>→ Fill ₹{cl.dueAmt} (full due amount)</Text>
            </TouchableOpacity>
          )}
        </Sec>

        {/* Add Date */}
        <Sec title="ADD TIFFIN DATE">
          <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
            <TextInput style={[s.payInput, { backgroundColor:T.inputBg, borderColor:T.border, color:T.text }]}
              placeholder="Date (1–31)" placeholderTextColor={T.text3}
              value={dateInput} onChangeText={setDateInput} keyboardType="numeric" />
            <TouchableOpacity style={[s.payBtn, { backgroundColor:COLORS.primary, opacity: busyDate?0.6:1 }]} onPress={handleAddDate} disabled={busyDate}>
              {busyDate ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color:'white', fontWeight:'800', fontSize:13 }}>Add Day ➕</Text>}
            </TouchableOpacity>
          </View>
        </Sec>

        {/* Notes */}
        <Sec title="NOTES">
          <TextInput style={[s.noteInput, { backgroundColor:T.inputBg, borderColor:T.border, color:T.text }]}
            placeholder="Add notes about this customer..." placeholderTextColor={T.text3}
            value={note} onChangeText={setNote} multiline numberOfLines={3} />
          <TouchableOpacity style={{ backgroundColor:COLORS.primaryLight, borderRadius:10, padding:10, alignItems:'center', marginTop:8, opacity:busyNote?0.6:1 }}
            onPress={handleSaveNote} disabled={busyNote}>
            <Text style={{ color:COLORS.primary, fontWeight:'700', fontSize:13 }}>
              {busyNote ? '💾 Saving...' : '💾 Save Note'}
            </Text>
          </TouchableOpacity>
        </Sec>

        {/* WA preview */}
        <Sec title="WHATSAPP MESSAGE PREVIEW">
          <View style={{ backgroundColor:'#E8FDD8', borderRadius:14, padding:14, marginBottom:10 }}>
            <Text style={{ fontSize:12, color:'#1A3C1A', lineHeight:20 }}>{waMsg}</Text>
          </View>
          <TouchableOpacity style={{ backgroundColor:COLORS.whatsapp, borderRadius:14, padding:13, alignItems:'center' }} onPress={openWA}>
            <Text style={{ color:'white', fontWeight:'800', fontSize:14 }}>📤 Send on WhatsApp</Text>
          </TouchableOpacity>
        </Sec>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1 },
  header: { backgroundColor: COLORS.primary, flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop: Platform.OS==='ios'?54:18, paddingBottom:14, gap:12 },
  backBtn: { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
  headerTitle: { flex:1, color:'white', fontSize:17, fontWeight:'800' },
  editBtn: { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  identCard: { margin:16, borderRadius:16, borderWidth:0.5, padding:16 },
  actionBtn: { flex:1, borderRadius:12, padding:10, alignItems:'center' },
  section: { paddingHorizontal:16, paddingVertical:14, borderBottomWidth:0.5 },
  secTitle: { fontSize:10, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 },
  payInput: { flex:1, borderWidth:0.5, borderRadius:12, padding:11, fontSize:14, fontWeight:'600' },
  payBtn: { backgroundColor:COLORS.success, borderRadius:12, paddingHorizontal:14, paddingVertical:11, minWidth:110, alignItems:'center' },
  noteInput: { borderWidth:0.5, borderRadius:12, padding:12, fontSize:13, minHeight:70, textAlignVertical:'top' },
});
