/**
 * Root index — redirects to tabs or connect screen based on connection state.
 */
import { Redirect } from 'expo-router';
import { useConnectionStore } from '@/lib/connection-store';

export default function Index() {
  const status = useConnectionStore((s) => s.status);

  if (status === 'connected') {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/connect" />;
}
