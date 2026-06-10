// src/screens/SettingsScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore } from '../services/store';

const C = {
  bg:'#04060c', bg2:'#080c14', bg3:'#0c1020',
  cyan:'#00f5ff', red:'#ff3355',
  text:'#e2e8f8', text2:'#6b7a99', text3:'#2d3650',
  border:'rgba(0,245,255,0.12)',
};

export default function SettingsScreen({ navigation }) {
  const { user, logout, quality, embedMeta, saveThumbnail, skipDupes, defaultMode, setSetting } = useStore();

  const qualityOptions = [
    { val:'128', label:'128 kbps — Small files' },
    { val:'192', label:'192 kbps — Standard' },
    { val:'320', label:'320 kbps — High quality' },
    { val:'0',   label:'Best available' },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <Text style={s.logo}>SETTINGS</Text>

      {/* Account */}
      {user && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.userCard}>
            <Icon name="account-circle-outline" size={36} color={C.cyan}/>
            <View style={s.userInfo}>
              <Text style={s.userName}>{user.name || 'User'}</Text>
              <Text style={s.userEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={logout}>
              <Text style={s.logoutTxt}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Audio Quality */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>AUDIO QUALITY (MP3)</Text>
        {qualityOptions.map(opt => (
          <TouchableOpacity key={opt.val} style={[s.optRow, quality===opt.val && s.optRowActive]}
            onPress={() => setSetting('quality', opt.val)}>
            <Text style={[s.optTxt, quality===opt.val && { color:C.cyan }]}>{opt.label}</Text>
            {quality === opt.val && <Icon name="check-circle" size={18} color={C.cyan}/>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Default Format */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>DEFAULT FORMAT</Text>
        {[['audio','🎵 MP3 Audio only'],['video','🎬 MP4 Video only']].map(([m, label]) => (
          <TouchableOpacity key={m} style={[s.optRow, defaultMode===m && s.optRowActive]}
            onPress={() => setSetting('defaultMode', m)}>
            <Text style={[s.optTxt, defaultMode===m && { color:C.cyan }]}>{label}</Text>
            {defaultMode === m && <Icon name="check-circle" size={18} color={C.cyan}/>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Toggles */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>OPTIONS</Text>
        {[
          ['embedMeta',     embedMeta,     'Embed Metadata',    'Tag MP3/MP4 with title, artist, artwork'],
          ['saveThumbnail', saveThumbnail, 'Save Thumbnails',   'Save cover art alongside each track'],
          ['skipDupes',     skipDupes,     'Skip Duplicates',   'Don\'t re-download existing files'],
        ].map(([key, val, label, desc]) => (
          <View key={key} style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Text style={s.toggleLabel}>{label}</Text>
              <Text style={s.toggleDesc}>{desc}</Text>
            </View>
            <Switch value={val} onValueChange={v => setSetting(key, v)}
              trackColor={{ false: C.bg3, true: 'rgba(0,245,255,0.3)' }}
              thumbColor={val ? C.cyan : C.text3}/>
          </View>
        ))}
      </View>

      {/* Legal */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>LEGAL</Text>
        {[
          ['Privacy Policy', 'Privacy', 'shield-account-outline'],
          ['Terms of Service','Terms',  'file-document-outline'],
        ].map(([label, route, icon]) => (
          <TouchableOpacity key={route} style={s.legalRow} onPress={() => navigation.navigate(route)}>
            <Icon name={icon} size={18} color={C.text2} style={{ marginRight:10 }}/>
            <Text style={s.legalTxt}>{label}</Text>
            <Icon name="chevron-right" size={18} color={C.text3} style={{ marginLeft:'auto' }}/>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.version}>StreamRipper v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  scroll:       { padding:20, paddingTop:52, paddingBottom:40 },
  logo:         { fontFamily:'Orbitron-Bold', fontSize:18, color:C.cyan, letterSpacing:4, marginBottom:24 },
  section:      { marginBottom:24 },
  sectionLabel: { fontFamily:'ShareTechMono-Regular', fontSize:10, color:C.text2, textTransform:'uppercase', letterSpacing:2, marginBottom:10 },
  userCard:     { backgroundColor:C.bg2, borderRadius:10, borderWidth:1, borderColor:C.border, padding:14, flexDirection:'row', alignItems:'center', gap:12 },
  userInfo:     { flex:1 },
  userName:     { fontFamily:'Rajdhani-Bold', fontSize:16, color:C.text },
  userEmail:    { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2 },
  logoutBtn:    { paddingHorizontal:12, paddingVertical:6, borderRadius:6, borderWidth:1, borderColor:'rgba(255,51,85,0.4)' },
  logoutTxt:    { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.red },
  optRow:       { backgroundColor:C.bg2, borderRadius:8, borderWidth:1, borderColor:C.border, padding:13, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  optRowActive: { borderColor:C.cyan, backgroundColor:'rgba(0,245,255,0.06)' },
  optTxt:       { fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text2 },
  toggleRow:    { backgroundColor:C.bg2, borderRadius:8, borderWidth:1, borderColor:C.border, padding:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:6 },
  toggleLeft:   { flex:1, marginRight:12 },
  toggleLabel:  { fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text, marginBottom:2 },
  toggleDesc:   { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2 },
  legalRow:     { backgroundColor:C.bg2, borderRadius:8, borderWidth:1, borderColor:C.border, padding:14, flexDirection:'row', alignItems:'center', marginBottom:6 },
  legalTxt:     { fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text2 },
  version:      { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text3, textAlign:'center', marginTop:8 },
});
