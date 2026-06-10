// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useStore } from '../services/store';

const C = {
  bg:'#04060c', bg2:'#080c14', bg3:'#0c1020',
  cyan:'#00f5ff', pink:'#ff2d78', green:'#00ff88',
  text:'#e2e8f8', text2:'#6b7a99', text3:'#2d3650',
  border:'rgba(0,245,255,0.15)', red:'#ff3355',
};

export default function LoginScreen({ navigation }) {
  const [mode,     setMode]     = useState('login');   // 'login' | 'register'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login, register }     = useStore();

  async function submit() {
    if (!email || !password) { Alert.alert('Error','Email and password required'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password);
      } else {
        if (!name) { Alert.alert('Error','Name required'); setLoading(false); return; }
        await register(email.trim().toLowerCase(), password, name.trim());
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['rgba(0,245,255,0.06)','transparent']} style={s.glow}/>

        <Text style={s.logo}>STREAM<Text style={{color:C.cyan}}>RIPPER</Text></Text>
        <Text style={s.tagline}>Download anything. Everywhere.</Text>

        <View style={s.card}>
          <View style={s.tabs}>
            {['login','register'].map(m => (
              <TouchableOpacity key={m} style={[s.tab, mode===m && s.tabActive]} onPress={()=>setMode(m)}>
                <Text style={[s.tabTxt, mode===m && s.tabTxtActive]}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'register' && (
            <>
              <Text style={s.label}>FULL NAME</Text>
              <TextInput style={s.input} value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor={C.text3} autoCapitalize="words"/>
            </>
          )}

          <Text style={s.label}>EMAIL</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="you@email.com" placeholderTextColor={C.text3}
            keyboardType="email-address" autoCapitalize="none"/>

          <Text style={s.label}>PASSWORD</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={C.text3} secureTextEntry/>

          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#000"/>
              : <Text style={s.btnTxt}>{mode==='login'?'SIGN IN':'CREATE ACCOUNT'}</Text>
            }
          </TouchableOpacity>

          <View style={s.legal}>
            <Text style={s.legalTxt}>By continuing you agree to our </Text>
            <TouchableOpacity onPress={()=>navigation.navigate('Terms')}>
              <Text style={s.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={s.legalTxt}> and </Text>
            <TouchableOpacity onPress={()=>navigation.navigate('Privacy')}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.platforms}>
          {['YouTube','YT Music','Instagram','TikTok'].map(p=>(
            <View key={p} style={s.ptag}><Text style={s.ptagTxt}>{p}</Text></View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex:1, backgroundColor:C.bg },
  scroll:    { flexGrow:1, alignItems:'center', justifyContent:'center', padding:24 },
  glow:      { position:'absolute', top:0, left:0, right:0, height:300 },
  logo:      { fontFamily:'Orbitron-Black', fontSize:28, color:'#fff', letterSpacing:4, marginBottom:4 },
  tagline:   { fontFamily:'ShareTechMono-Regular', fontSize:12, color:C.text2, marginBottom:40 },
  card:      { width:'100%', backgroundColor:C.bg2, borderRadius:14, borderWidth:1, borderColor:C.border, padding:20 },
  tabs:      { flexDirection:'row', marginBottom:20, borderRadius:8, overflow:'hidden', backgroundColor:C.bg3 },
  tab:       { flex:1, padding:10, alignItems:'center' },
  tabActive: { backgroundColor:'rgba(0,245,255,0.1)' },
  tabTxt:    { fontFamily:'Rajdhani-SemiBold', fontSize:14, color:C.text2 },
  tabTxtActive:{ color:C.cyan },
  label:     { fontFamily:'ShareTechMono-Regular', fontSize:10, color:C.text2, textTransform:'uppercase', letterSpacing:2, marginBottom:6 },
  input:     { backgroundColor:C.bg3, borderWidth:1, borderColor:C.border, borderRadius:8, color:C.text, fontFamily:'ShareTechMono-Regular', fontSize:14, padding:12, marginBottom:16 },
  btn:       { backgroundColor:C.cyan, borderRadius:8, padding:14, alignItems:'center', marginTop:4 },
  btnTxt:    { fontFamily:'Orbitron-Bold', fontSize:12, color:'#000', letterSpacing:2 },
  legal:     { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginTop:16 },
  legalTxt:  { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2 },
  legalLink: { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.cyan },
  platforms: { flexDirection:'row', gap:8, marginTop:24, flexWrap:'wrap', justifyContent:'center' },
  ptag:      { backgroundColor:'rgba(0,245,255,0.06)', borderWidth:1, borderColor:C.border, borderRadius:6, paddingHorizontal:10, paddingVertical:4 },
  ptagTxt:   { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2 },
});
