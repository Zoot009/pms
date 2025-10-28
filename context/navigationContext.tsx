"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrentPage?: boolean;
}

interface NavigationContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  customBreadcrumbs?: BreadcrumbItem[];
  setCustomBreadcrumbs: (breadcrumbs?: BreadcrumbItem[]) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState<string>('');
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[] | undefined>(undefined);

  return (
    <NavigationContext.Provider
      value={{
        activePage,
        setActivePage,
        customBreadcrumbs,
        setCustomBreadcrumbs,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
