import React from 'react';
export default function CloudAutoSyncHeaderBar({ onOpenSyncHealth }: { onOpenSyncHealth: () => void }) {
  return <div className="p-2 bg-blue-100 cursor-pointer" onClick={onOpenSyncHealth}>Cloud Sync Active</div>;
}
