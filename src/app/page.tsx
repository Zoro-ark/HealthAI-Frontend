'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Home from '@/Components/Home/Home';
import {useUser} from '@clerk/nextjs';

export default function HomePage() {
  return (
    <>
      <Home />
    </>
  );
}
