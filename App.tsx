import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>⌃</Text>
      </View>

      <Text style={styles.title}>ATHLORE</Text>

      <Text style={styles.tagline}>
        Every session tells a story.
      </Text>

      <Text style={styles.impact}>
        YOUR TRAINING. YOUR PROGRESS.{ '\n' } YOUR STORY.
      </Text>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11151F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: '#24344D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logo: {
    fontSize: 48,
    fontWeight: '300',
    color: '#8EDBC8',
    lineHeight: 52,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#F8FAFC',
  },

  tagline: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '600',
    color: '#8EDBC8',
    textAlign: 'center',
  },

  impact: {
    marginTop: 20,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#7F8999',
    textAlign: 'center',
  },

});
