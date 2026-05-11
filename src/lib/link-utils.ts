/**
 * Utility functions for handling link behavior
 */

/**
 * Check if a URL is external (not same origin)
 */
export const isExternalLink = (url: string): boolean => {
  try {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return urlObj.origin !== currentOrigin;
  } catch {
    return false;
  }
};

/**
 * Handle link click - opens external links in new window
 */
export const handleLinkClick = (
  href: string | undefined,
  event?: React.MouseEvent<HTMLAnchorElement>
): void => {
  if (!href) return;

  // Check if it's an external link
  if (isExternalLink(href)) {
    event?.preventDefault();
    window.open(href, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Get link props for external links
 */
export const getExternalLinkProps = (href: string) => {
  if (isExternalLink(href)) {
    return {
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  }
  return {};
};
