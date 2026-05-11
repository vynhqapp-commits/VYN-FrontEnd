'use client';

import Link, { LinkProps } from 'next/link';
import { ReactNode, MouseEvent } from 'react';
import { getExternalLinkProps, isExternalLink } from '@/lib/link-utils';

interface ExternalLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  [key: string]: any;
}

/**
 * Custom Link component that automatically opens external links in new windows
 * Internal links use Next.js Link for client-side navigation
 * External links open in new windows with proper security attributes
 */
export default function CustomLink({
  href,
  children,
  onClick,
  ...props
}: ExternalLinkProps) {
  const isExternal = isExternalLink(href);
  const externalProps = getExternalLinkProps(href);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    
    if (isExternal) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  // For external links, use regular anchor tag
  if (isExternal) {
    return (
      <a href={href} onClick={handleClick} {...externalProps} {...props}>
        {children}
      </a>
    );
  }

  // For internal links, use Next.js Link
  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
