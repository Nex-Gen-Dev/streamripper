// src/screens/SearchScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Image, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore } from '../services/store';

const C = { bg:'#04060c',bg2:'#080c14',bg3:'#0c1020',cyan:'#00f5ff',pink:'#ff2d78',text:'#e2e8f8',text2:'#6b7a99',text3:'#2d3650',border:'rgba(0,245,255,0.12)' };

// The desktop app runs on localhost:7474; Android hits the same network
const API = 'http://10.0.2.2:7474'; // 10.0.2.2 = Android emulator localhost; change for real device

export default function SearchScreen({ navigation }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode,    setMode]    = useState('audio');
  const addToQueue = useStore(s => s.addToQueue);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true); setResults([]);
    try {
      const res  = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      Alert.alert('Search failed','Check your connection or the desktop app is running');
    }
    setLoading(false);
  }

  function addItem(item) {
    addToQueue({ url: item.url, title: item.title, artist: item.uploader, mode });
    Alert.alert('Added!', `${item.title} added to queue as ${mode === 'audio' ? 'MP3' : 'MP4'}`);
  }

  function fmt(s) {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${String(sec).padStart(2,'0')}`;
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.logo}>SEARCH</Text>
        <View style={s.searchRow}>
          <View style={s.searchWrap}>
            <Icon name="magnify" size={20} color={C.text2} style={s.searchIcon}/>
            <TextInput style={s.searchInput} value={query} onChangeText={setQuery}
              placeholder="Artist, song, album…" placeholderTextColor={C.text3}
              onSubmitEditing={doSearch} returnKeyType="search"/>
          </View>
          <TouchableOpacity style={s.searchBtn} onPress={doSearch}>
            <Text style={s.searchBtnTxt}>GO</Text>
          </TouchableOpacity>
        </View>
        <View style={s.modeRow}>
          {['audio','video'].map(m=>(
            <TouchableOpacity key={m} style={[s.modePill, mode===m && s.modePillActive]} onPress={()=>setMode(m)}>
              <Text style={[s.modeTxt, mode===m && s.modeTxtActive]}>
                {m==='audio'?'🎵 MP3':'🎬 MP4'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && <ActivityIndicator color={C.cyan} style={{marginTop:40}}/>}

      <FlatList
        data={results}
        keyExtractor={i=>i.id||i.url}
        contentContainerStyle={s.list}
        renderItem={({item})=>(
          <TouchableOpacity style={s.card} onPress={()=>addItem(item)}>
            {item.thumbnail
              ? <Image source={{uri:item.thumbnail}} style={s.thumb}/>
              : <View style={[s.thumb,s.thumbPh]}><Text style={{fontSize:24}}>🎵</Text></View>
            }
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.cardMeta}>{item.uploader}{item.duration?`  ·  ${fmt(item.duration)}`:''}</Text>
            </View>
            <View style={s.addBtn}>
              <Icon name="plus-circle" size={28} color={C.cyan}/>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading && (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Search for any artist or song</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:C.bg },
  header:      { backgroundColor:C.bg2, borderBottomWidth:1, borderBottomColor:C.border, padding:16, paddingTop:48 },
  logo:        { fontFamily:'Orbitron-Bold', fontSize:16, color:C.cyan, letterSpacing:4, marginBottom:12 },
  searchRow:   { flexDirection:'row', gap:8, marginBottom:10 },
  searchWrap:  { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:C.bg3, borderRadius:8, borderWidth:1, borderColor:C.border },
  searchIcon:  { paddingLeft:10 },
  searchInput: { flex:1, color:C.text, fontFamily:'ShareTechMono-Regular', fontSize:14, padding:10 },
  searchBtn:   { backgroundColor:C.cyan, borderRadius:8, paddingHorizontal:16, justifyContent:'center' },
  searchBtnTxt:{ fontFamily:'Orbitron-Bold', fontSize:12, color:'#000' },
  modeRow:     { flexDirection:'row', gap:8 },
  modePill:    { paddingHorizontal:14, paddingVertical:6, borderRadius:99, backgroundColor:C.bg3, borderWidth:1, borderColor:C.border },
  modePillActive:{ backgroundColor:'rgba(0,245,255,0.12)', borderColor:C.cyan },
  modeTxt:     { fontFamily:'Rajdhani-SemiBold', fontSize:13, color:C.text2 },
  modeTxtActive:{ color:C.cyan },
  list:        { padding:12, gap:8 },
  card:        { flexDirection:'row', backgroundColor:C.bg2, borderRadius:10, overflow:'hidden', borderWidth:1, borderColor:C.border, alignItems:'center' },
  thumb:       { width:80, height:52, resizeMode:'cover' },
  thumbPh:     { backgroundColor:C.bg3, alignItems:'center', justifyContent:'center' },
  cardBody:    { flex:1, padding:10 },
  cardTitle:   { fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text, lineHeight:18 },
  cardMeta:    { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2, marginTop:2 },
  addBtn:      { padding:12 },
  empty:       { alignItems:'center', marginTop:80 },
  emptyTxt:    { fontFamily:'ShareTechMono-Regular', fontSize:13, color:C.text3 },
});
