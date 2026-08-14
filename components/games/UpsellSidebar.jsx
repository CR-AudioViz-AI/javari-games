'use client';
import React from 'react';
import Link from 'next/link';
export default function UpsellSidebar({ className='' }) {
  const items = [
    { title: 'CRAudioVizAI Games AI — Pro', href: '/pricing#pro' },
    { title: 'Javariverse — Early Access', href: '/javariverse' },
    { title: 'Courses & Ebooks', href: '/ebooks' },
    { title: 'Newsletter (Free)', href: '/rss' },
  ];
  return (
    <aside className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold">Power ups</h3>
      <ul className="space-y-2">
        {items.map((x) => (
          <li key={x.title}>
            <Link href={x.href} className="underline">{x.title}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
