
import React from 'react';

type AppNameEditorProps = {
  appName: string;
  isDesktop?: boolean;
};

export function AppNameEditor({
  appName,
  isDesktop = false
}: AppNameEditorProps) {
  return (
    <div className="flex items-center space-x-2 overflow-hidden">
      <h2 className={`font-semibold truncate ${isDesktop ? 'text-lg' : 'text-base'}`}>
        {appName}
      </h2>
    </div>
  );
}
