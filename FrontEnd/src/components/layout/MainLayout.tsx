import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
