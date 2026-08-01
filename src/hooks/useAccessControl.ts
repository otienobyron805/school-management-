import { useState } from 'react';

export const useAccessControl = (currentPermissions: string[]) => {
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  const checkAccess = (requiredPermission: string, action: () => void) => {
    if (currentPermissions.includes(requiredPermission)) {
      action();
    } else {
      setShowAccessDenied(true);
      setTimeout(() => setShowAccessDenied(false), 5000);
    }
  };

  return { checkAccess, showAccessDenied, setShowAccessDenied };
};
