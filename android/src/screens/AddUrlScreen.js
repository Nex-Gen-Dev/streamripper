// src/screens/AddUrlScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useStore } from '../services/store';

const C = { bg:'#04060c', bg2:'#080c14', bg3:'#0c1020', cyan:'#00f5ff', text:'#e2e8f8', text2:'#6b7a99', text3:'#2d3650', border:'rgba(0,245,255,0.12)' };
const API = 'http://10.0.2.2:7474'; // Android emulator localhost — change to your PC IP for real device

export default function AddUrlScreen() {
  const [urls,    setUrls]    = useState('');
  const [artist,  setArtist]  = useState('');
  const [album,   setAlbum]   = useState('');
  const [mode,    setMode]    = useState('audio');
  const [loading, setLoading] = useState(false);
  const addToQueue = useStore(s => s.addToQueue);
  const { token }  = useStore();

  const PLATFORMS = [
    { label:'▶ YouTube',   color:'#ff5555' },
    { label:'♪ YT Music',  color:'#ff7c44' },
    { label:'◈ Instagram', color:'#e040fb' },
    { label:'⊛ TikTok',   color:'#69c9d0' },
  ];

  async function addAll() {
    const list = urls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!list.length) { Alert.alert('Error', 'Paste at least one URL'); return; }
    setLoading(true);
    let added = 0;
    for (const url of list) {
      try {
        const res = await fetch(`${API}/api/enqueue`, {
          method:  'POST',
          headers: { 'Content-Type':'application/json', 'X-Auth-Token': token||'' },
          body:    JSON.stringify({ url, artist, album, mode, title: url }),
        });
        const data = await res.json();
        if (!data.error) {
          addToQueue({ url, artist, album, mode, title: url });
          added++;
        }
      } catch {}
    }
    setLoading(false);
    Alert.alert('Done', `${added} of ${list.length} item(s) added to queue`);
    if (added > 0) setUrls('');
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>ADD URL</Text>
      <Text style={s.sub}>Paste one URL per line. Playlists auto-expand.</Text>

      {/* Platform pills */}
      <View style={s.platforms}>
        {PLATFORMS.map(p => (
          <View key={p.label} style={[s.ptag, { borderColor: p.color+'44', backgroundColor: p.color+'11' }]}>
            <Text style={[s.ptagTxt, { color: p.color }]}>{p.label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.label}>URLs — ONE PER LINE</Text>
      <TextInput
        style={[s.input, { height:130, textAlignVertical:'top' }]}
        value={urls} onChangeText={setUrls} multiline
        placeholder={'https://youtube.com/watch?v=...\nhttps://youtube.com/playlist?list=...\nhttps://tiktok.com/@artist/video/...\nhttps://instagram.com/p/...'}
        placeholderTextColor={C.text3}
      />

      <View style={s.row}>
        <View style={s.half}>
          <Text style={s.label}>ARTIST (optional)</Text>
          <TextInput style={s.input} value={artist} onChangeText={setArtist} placeholder="e.g. Drake" placeholderTextColor={C.text3}/>
        </View>
        <View style={s.half}>
          <Text style={s.label}>ALBUM (optional)</Text>
          <TextInput style={s.input} value={album} onChangeText={setAlbum} placeholder="e.g. Certified" placeholderTextColor={C.text3}/>
        </View>
      </View>

      <Text style={s.label}>FORMAT</Text>
      <View style={s.modeRow}>
        {[['audio','🎵 MP3 Only'],['video','🎬 MP4 Only']].map(([m, label]) => (
          <TouchableOpacity key={m} style={[s.modePill, mode===m && s.modePillActive]} onPress={() => setMode(m)}>
            <Text style={[s.modeTxt, mode===m && { color:C.cyan }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.btn} onPress={addAll} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#000"/>
          : <Text style={s.btnTxt}>+ ADD TO QUEUE</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  scroll:       { padding:20, paddingTop:52, paddingBottom:40 },
  logo:         { fontFamily:'Orbitron-Bold', fontSize:18, color:C.cyan, letterSpacing:4, marginBottom:4 },
  sub:          { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2, marginBottom:20 },
  platforms:    { flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:20 },
  ptag:         { paddingHorizontal:10, paddingVertical:5, borderRadius:6, borderWidth:1 },
  ptagTxt:      { fontFamily:'ShareTechMono-Regular', fontSize:11 },
  label:        { fontFamily:'ShareTechMono-Regular', fontSize:10, color:C.text2, textTransform:'uppercase', letterSpacing:2, marginBottom:8 },
  input:        { backgroundColor:C.bg2, borderWidth:1, borderColor:C.border, borderRadius:8, color:C.text, fontFamily:'ShareTechMono-Regular', fontSize:13, padding:12, marginBottom:16 },
  row:          { flexDirection:'row', gap:12 },
  half:         { flex:1 },
  modeRow:      { flexDirection:'row', gap:8, marginBottom:20 },
  modePill:     { flex:1, paddingVertical:10, borderRadius:8, backgroundColor:C.bg2, borderWidth:1, borderColor:C.border, alignItems:'center' },
  modePillActive:{ backgroundColor:'rgba(0,245,255,0.1)', borderColor:C.cyan },
  modeTxt:      { fontFamily:'Rajdhani-SemiBold', fontSize:13, color:C.text2 },
  btn:          { backgroundColor:C.cyan, borderRadius:8, padding:16, alignItems:'center' },
  btnTxt:       { fontFamily:'Orbitron-Bold', fontSize:12, color:'#000', letterSpacing:2 },
});
