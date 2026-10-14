import React from 'react';
import StandaloneMasterEditorPortal from './StandaloneMasterEditorPortal';

export default function MasterRuleEditorScreen({ user, onTabChange }) {
  return (
    <StandaloneMasterEditorPortal
      user={user}
      onExitToCounterApp={() => {
        if (onTabChange) {
          onTabChange('dashboard');
        } else {
          window.location.href = '/';
        }
      }}
    />
  );
}
