// src/screens/TermsScreen.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
const C = { bg:'#04060c', cyan:'#00f5ff', text:'#e2e8f8', text2:'#6b7a99' };
const SECTIONS = [
  ['Acceptance','By installing or using StreamRipper you agree to these Terms. If you disagree, uninstall the app and do not use it.'],
  ['Permitted Use','StreamRipper is for personal, non-commercial downloading of publicly accessible media. You are solely responsible for ensuring your use complies with copyright laws in your country.'],
  ['Copyright','StreamRipper does not host or redistribute copyrighted content. All media is downloaded directly from third-party platforms via their public-facing interfaces. Users must respect those platforms\' terms of service.'],
  ['Account Rules','You may not create accounts for others without their consent, share your credentials, or use automated tools to create bulk accounts.'],
  ['No Warranty','StreamRipper is provided "as is". We make no guarantees of uptime, download success, or compatibility with any specific platform.'],
  ['Limitation of Liability','We are not liable for any legal consequences arising from your downloads, data loss, device damage, or platform blocks.'],
  ['Termination','We may suspend or ban accounts that violate these terms at our sole discretion, without notice.'],
  ['Modifications','We may update these terms at any time. The updated date is shown below the title. Continued use constitutes acceptance.'],
  ['Governing Law','These terms are governed by the laws of the developer\'s jurisdiction without regard to conflict-of-law rules.'],
  ['Contact','legal@streamripper.app'],
];
export default function TermsScreen() {
  return (
    <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:20,paddingBottom:40}}>
      <Text style={s.title}>Terms of Service</Text>
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
  title:{ fontFamily:'Orbitron-Bold', fontSize:20, color:'#e2e8f8', marginBottom:4 },
  date: { fontFamily:'ShareTechMono-Regular', fontSize:11, color:'#6b7a99', marginBottom:24 },
  block:{ marginBottom:20 },
  h:    { fontFamily:'Rajdhani-Bold', fontSize:15, color:'#00f5ff', marginBottom:6 },
  p:    { fontFamily:'ShareTechMono-Regular', fontSize:12, color:'#6b7a99', lineHeight:20 },
});
