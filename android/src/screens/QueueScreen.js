// src/screens/QueueScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useStore } from '../services/store';

const C = { bg:'#04060c',bg2:'#080c14',bg3:'#0c1020',cyan:'#00f5ff',pink:'#ff2d78',green:'#00ff88',red:'#ff3355',gold:'#ffd700',orange:'#ff7c00',text:'#e2e8f8',text2:'#6b7a99',text3:'#2d3650',border:'rgba(0,245,255,0.12)' };
const API = 'http://10.0.2.2:7474';

const STATUS_COLOR = { queued:C.text3, starting:C.pink, downloading:C.cyan, processing:C.gold, done:C.green, failed:C.red, cancelled:C.text3 };

export default function QueueScreen() {
  const { queue, updateJob, clearFinished } = useStore();
  const pollRef = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(pollQueue, 800);
    return () => clearInterval(pollRef.current);
  }, []);

  async function pollQueue() {
    try {
      const res  = await fetch(`${API}/api/queue`);
      const jobs = await res.json();
      jobs.forEach(j => updateJob(j.id, j));
    } catch {}
  }

  async function cancelJob(id) {
    await fetch(`${API}/api/queue/${id}/cancel`, { method: 'DELETE' });
    updateJob(id, { status: 'cancelled' });
  }

  function renderItem({ item: job }) {
    const bColor = STATUS_COLOR[job.status] || C.text2;
    const pct    = job.progress || 0;
    return (
      <View style={[s.card, { borderLeftColor: bColor }]}>
        <View style={s.cardTop}>
          <Text style={s.title} numberOfLines={1}>{job.title || job.url}</Text>
          <View style={[s.chip, { backgroundColor: bColor + '22' }]}>
            <Text style={[s.chipTxt, { color: bColor }]}>{job.status}</Text>
          </View>
        </View>
        <Text style={s.meta}>
          {job.platform}  ·  {job.mode === 'video' ? '🎬 MP4' : '🎵 MP3'}
          {job.speed ? `  ·  ${job.speed}` : ''}
          {job.eta   ? `  ·  ETA ${job.eta}` : ''}
        </Text>
        {job.status === 'failed' && job.error && (
          <Text style={s.errTxt} numberOfLines={2}>{job.error}</Text>
        )}
        {!['queued','cancelled'].includes(job.status) && (
          <View style={s.progWrap}>
            <View style={[s.progBar, {
              width: `${pct}%`,
              backgroundColor: job.status === 'done' ? C.green : job.status === 'failed' ? C.red : C.cyan
            }]}/>
          </View>
        )}
        {!['done','failed','cancelled'].includes(job.status) && (
          <TouchableOpacity style={s.cancelBtn} onPress={() => cancelJob(job.id)}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const active = queue.filter(j => ['queued','downloading','processing','starting'].includes(j.status)).length;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.logo}>QUEUE</Text>
        <Text style={s.sub}>{active} active · {queue.length} total</Text>
        <TouchableOpacity style={s.clearBtn} onPress={clearFinished}>
          <Text style={s.clearTxt}>Clear Finished</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={j => j.id}
        contentContainerStyle={s.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Queue is empty</Text>
            <Text style={s.emptySub}>Search for music or add a URL to start</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex:1, backgroundColor:C.bg },
  header:    { backgroundColor:C.bg2, borderBottomWidth:1, borderBottomColor:C.border, padding:16, paddingTop:48, flexDirection:'row', alignItems:'center', gap:12 },
  logo:      { fontFamily:'Orbitron-Bold', fontSize:16, color:C.cyan, letterSpacing:4, flex:1 },
  sub:       { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2 },
  clearBtn:  { backgroundColor:'rgba(0,245,255,0.08)', borderWidth:1, borderColor:C.border, borderRadius:6, paddingHorizontal:10, paddingVertical:5 },
  clearTxt:  { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.cyan },
  list:      { padding:12, gap:8 },
  card:      { backgroundColor:C.bg2, borderRadius:8, borderWidth:1, borderColor:C.border, borderLeftWidth:3, padding:12 },
  cardTop:   { flexDirection:'row', alignItems:'center', marginBottom:4, gap:8 },
  title:     { flex:1, fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text },
  chip:      { paddingHorizontal:8, paddingVertical:2, borderRadius:4 },
  chipTxt:   { fontFamily:'ShareTechMono-Regular', fontSize:10 },
  meta:      { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2, marginBottom:6 },
  errTxt:    { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.red, marginBottom:4 },
  progWrap:  { height:3, backgroundColor:C.bg3, borderRadius:99, overflow:'hidden', marginBottom:6 },
  progBar:   { height:'100%', borderRadius:99 },
  cancelBtn: { alignSelf:'flex-end', paddingHorizontal:10, paddingVertical:4, borderWidth:1, borderColor:'rgba(255,51,85,0.3)', borderRadius:5 },
  cancelTxt: { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.red },
  empty:     { alignItems:'center', marginTop:80, gap:8 },
  emptyTxt:  { fontFamily:'Orbitron-Regular', fontSize:14, color:C.text3 },
  emptySub:  { fontFamily:'ShareTechMono-Regular', fontSize:12, color:C.text3 },
});
