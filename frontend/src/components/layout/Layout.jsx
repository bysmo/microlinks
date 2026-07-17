import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header />
        <main
          id="main-content"
          className="flex-1 p-6 overflow-auto animate-fade-in"
          role="main"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
