import React, { useState } from 'react';
import { PuckEditor } from './components/PuckEditor';

export default function App() {
  const [saved, setSaved] = useState<any>(null);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-7xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Editor Visual da Loja</h1>

        <PuckEditor
          onPublish={(data) => {
            setSaved(data);
            console.log('Publicando layout', data);
          }}
        />
      </div>

      {saved && (
        <pre className="mt-6 bg-white p-4 rounded shadow max-w-5xl mx-auto overflow-auto">
          {JSON.stringify(saved, null, 2)}
        </pre>
      )}
    </div>
  );
}
