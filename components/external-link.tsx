import Link from 'next/link';
import { type ComponentProps } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

type Href = string | { pathname: string; query?: Record<string, string> };

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { 
  href: Href;
  openInApp?: boolean; // Optional prop to control behavior
};

export function ExternalLink({ href, openInApp = true, ...rest }: Props) {
  const handlePress = async (event: any) => {
    if (Platform.OS !== 'web' && openInApp) {
      // Prevent the default behavior of linking to the default browser on native.
      event.preventDefault();
      
      // Open the link in an in-app browser.
      const url = typeof href === 'string' ? href : href.pathname;
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
      });
    }
  };

  return (
    <Link
      target="_blank"
      {...rest}
      href={href as any}
      onClick={Platform.OS === 'web' ? undefined : handlePress}
    />
  );
}