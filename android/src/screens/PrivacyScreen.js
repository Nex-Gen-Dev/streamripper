// src/screens/PrivacyScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
const C = { bg:'#04060c', cyan:'#00f5ff', text:'#e2e8f8', text2:'#6b7a99' };
const SECTIONS = [
  ['Information We Collect','We collect your email address and password (hashed with SHA-256) when you register. We automatically collect your IP address, device OS, and browser user agent to detect abuse and understand platform usage.'],
  ['How We Use Your Data','Your data is used to authenticate your account, sync download history across devices, and send in-app notifications and promotional messages you can dismiss. We do not sell your data to any third party.'],
  ['Data Storage','All account and event data is stored in Cloudflare Workers KV — encrypted at rest on Cloudflare\'s global network. Event logs are automatically purged after 90 days.'],
  ['Analytics & Logging','We log download completions, searches, and login events. These logs include IP address and device type but are never shared externally.'],
  ['Cookies & Tokens','We store an authentication token in your device\'s local storage to keep you logged in. No advertising cookies are used.'],
  ['Your Rights','You may request full deletion of your account and all data by emailing privacy@streamripper.app. You may use StreamRipper without an account — core download features do not require registration.'],
  ['Children\'s Privacy','StreamRipper is not intended for users under 13. We do not knowingly collect data from children.'],
  ['Changes','We may update this policy. Continued use after changes means you accept the updated policy.'],
  ['Contact','privacy@streamripper.app'],
];
export default function PrivacyScreen() {
  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:20,paddingBottom:40}}>
      <Text style={s.title}>Privacy Policy</Text>
      <Text style={s.date}>Effective: June 2026</Text>
      {SECTIONS.map(([h,p])=>(
        <View key={h} style={s.block}>
          <Text style={s.h}>{h}</Text>
          <Text style={s.p}>{p}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  title:{ fontFamily:'Orbitron-Bold', fontSize:20, color:C.text, marginBottom:4 },
  date: { fontFamily:'ShareTechMono-Regular', fontSize:11, color:C.text2, marginBottom:24 },
  block:{ marginBottom:20 },
  h:    { fontFamily:'Rajdhani-Bold', fontSize:15, color:C.cyan, marginBottom:6 },
  p:    { fontFamily:'ShareTechMono-Regular', fontSize:12, color:C.text2, lineHeight:20 },
});
