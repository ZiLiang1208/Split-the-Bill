import { Platform, Share } from 'react-native';

export type ShareLinkResult = 'shared' | 'copied' | 'cancelled' | 'unsupported';

/**
 * Cross-platform "send this link somewhere" trigger.
 * - Native (iOS/Android): opens the OS share sheet.
 * - Web: uses the Web Share API where available (mobile browsers), otherwise
 *   copies the link to the clipboard.
 */
export async function shareLink(url: string, message: string): Promise<ShareLinkResult> {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: message, url });
        return 'shared';
      } catch {
        return 'cancelled';
      }
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(url);
      return 'copied';
    }
    return 'unsupported';
  }

  const result = await Share.share({ message: `${message}\n${url}` });
  return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
